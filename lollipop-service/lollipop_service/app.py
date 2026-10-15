"""
The HTTP API: `POST /deconvolve` runs a deconvolution and answers with its result, synchronously.

A deconvolution's bootstrap takes from seconds to minutes, so its rounds are split up between a
pool of `LOLLIPOP_WORKERS` processes, at most `LOLLIPOP_WORKERS_PER_REQUEST` of them per request:
on a big pool, several requests are computed side by side, otherwise they take turns. When
`LOLLIPOP_MAX_REQUESTS` are in progress, further requests get a 503.

A pool whose process died (killed for lack of memory, say) is unusable, so it is replaced, and the
requests it was computing get another go on the new one. A request that takes longer than
`LOLLIPOP_TIMEOUT` seconds is given up: its processes stop at the next date they would fit, and
only if they haven't after another `LOLLIPOP_TIMEOUT`, the pool is replaced, the only other way to
stop them.

Every visitor of a dashboard page sends the same request, so results are cached, and a request
that is already running is joined instead of run twice.
"""

import asyncio
import hashlib
import logging
import multiprocessing
import os
import time
from collections import OrderedDict
from concurrent.futures import Future, ProcessPoolExecutor
from concurrent.futures.process import BrokenProcessPool
from contextlib import asynccontextmanager
from importlib.metadata import version

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from threadpoolctl import threadpool_limits

from .deconvolution import DeadlineExceeded, aggregate, fit_rounds
from .models import DeconvolutionRequest, DeconvolutionResponse

logger = logging.getLogger(__name__)


def _setting(name: str, default: int) -> int:
    return int(os.environ.get(f"LOLLIPOP_{name}", default))


WORKERS = _setting("WORKERS", os.cpu_count() or 1)
# Unlimited by default; the image sets 25 (see "Sizing" in README.md).
WORKERS_PER_REQUEST = _setting("WORKERS_PER_REQUEST", WORKERS)
MAX_REQUESTS = _setting("MAX_REQUESTS", 16)
TIMEOUT = _setting("TIMEOUT", 300)
CACHE_SIZE = _setting("CACHE_SIZE", 256)
MAX_BODY_BYTES = _setting("MAX_BODY_BYTES", 10_000_000)
MAX_FREQUENCIES = _setting("MAX_FREQUENCIES", 100_000)
MAX_LINEAGES = _setting("MAX_LINEAGES", 50)
MAX_BOOTSTRAPS = _setting("MAX_BOOTSTRAPS", 200)
# Comma-separated, like `https://wasap.genspectrum.org`; `*` (the default) allows every origin.
CORS_ORIGINS = os.environ.get("LOLLIPOP_CORS_ORIGINS", "*").split(",")

# The processes are forked from a server that has LolliPop loaded already, so they start quickly.
_CONTEXT = multiprocessing.get_context("forkserver")
_CONTEXT.set_forkserver_preload(["lollipop_service.deconvolution"])


def _init_worker() -> None:
    # One BLAS thread per process: the pool already keeps every CPU busy.
    threadpool_limits(1)


def _new_pool() -> ProcessPoolExecutor:
    return ProcessPoolExecutor(WORKERS, mp_context=_CONTEXT, initializer=_init_worker)


class Runner:
    def __init__(self):
        self.pool = _new_pool()
        self.cache: OrderedDict[str, DeconvolutionResponse] = OrderedDict()
        self.running: dict[str, asyncio.Future[DeconvolutionResponse]] = {}
        self.watches: set[asyncio.Task[None]] = set()

    async def start(self) -> None:
        """Starts the processes, so that the first request doesn't wait for them."""
        loop = asyncio.get_running_loop()
        await asyncio.gather(*(loop.run_in_executor(self.pool, os.getpid) for _ in range(WORKERS)))

    def stop(self) -> None:
        self.pool.shutdown(cancel_futures=True)

    async def run(self, request: DeconvolutionRequest) -> DeconvolutionResponse:
        key = hashlib.sha256(request.model_dump_json().encode()).hexdigest()
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        if key not in self.running:
            if len(self.running) >= MAX_REQUESTS:
                raise HTTPException(503, "Too many deconvolutions are running, please try again later.")
            future = asyncio.ensure_future(self._deconvolve(request))
            self.running[key] = future
            future.add_done_callback(lambda done: self._finished(key, done))
        # Shielded: a client that disconnects mustn't cancel the run for the others waiting on it.
        return await asyncio.shield(self.running[key])

    async def _deconvolve(self, request: DeconvolutionRequest) -> DeconvolutionResponse:
        parts = _split(request.options.bootstraps, min(WORKERS, WORKERS_PER_REQUEST))
        deadline = time.time() + TIMEOUT
        for _ in range(2):
            pool = self.pool
            fits = await self._fit(pool, request, parts, deadline)
            if not any(isinstance(fit, BrokenProcessPool) for fit in fits):
                break
            self._replace(pool, "a process of the pool died")
        else:
            raise HTTPException(503, "The deconvolution failed, please try again later.")
        if any(isinstance(fit, DeadlineExceeded) for fit in fits):
            raise HTTPException(503, f"The deconvolution took longer than {TIMEOUT} s.")
        for fit in fits:
            if isinstance(fit, BaseException):
                raise fit
        # In a thread: for large requests, it takes seconds.
        return await asyncio.to_thread(aggregate, request, [fit for part in fits for fit in part])

    async def _fit(self, pool: ProcessPoolExecutor, request: DeconvolutionRequest, parts, deadline: float) -> list:
        """The fits of the parts on the pool, or what they raised; a `DeadlineExceeded` at the deadline."""
        try:
            futures = [pool.submit(fit_rounds, request, *part, deadline) for part in parts]
        except BrokenProcessPool as error:
            # Raised right away if the pool is known to be broken; otherwise its futures do.
            return [error]
        _, pending = await asyncio.wait(
            [asyncio.wrap_future(future) for future in futures], timeout=max(0, deadline - time.time())
        )
        if pending:
            # Still waiting for their turn, behind other requests, or running until their next date.
            for future in futures:
                future.cancel()
            self._watch(pool, futures)
            return [DeadlineExceeded()]
        return [_outcome(future) for future in futures]

    def _watch(self, pool: ProcessPoolExecutor, futures: list[Future]) -> None:
        """
        Replaces the pool if a given-up request's processes don't stop. Every request's do by its
        deadline, plus the time to fit a date, so those still waiting for a process get one by then.
        """

        async def watch() -> None:
            _, running = await asyncio.wait([asyncio.wrap_future(future) for future in futures], timeout=TIMEOUT)
            if running:
                self._replace(pool, f"a deconvolution didn't stop {TIMEOUT} s after its time limit")

        task = asyncio.create_task(watch())
        self.watches.add(task)
        task.add_done_callback(self.watches.discard)

    def _replace(self, pool: ProcessPoolExecutor, reason: str) -> None:
        # Once, whichever of the requests on the old pool gets here first.
        if pool is self.pool:
            logger.warning("Replacing the process pool: %s", reason)
            self.pool = _new_pool()
            pool.kill_workers()
            pool.shutdown(wait=False, cancel_futures=True)

    def _finished(self, key: str, future: asyncio.Future[DeconvolutionResponse]) -> None:
        del self.running[key]
        if not future.cancelled() and future.exception() is None:
            self.cache[key] = future.result()
            if len(self.cache) > CACHE_SIZE:
                self.cache.popitem(last=False)


def _outcome(future: Future):
    if future.cancelled():
        # By the shutdown of a broken pool.
        return BrokenProcessPool("cancelled with its pool")
    return future.exception() or future.result()


def _split(rounds: int, parts: int) -> list[tuple[int, int]]:
    """`rounds` split into at most `parts` runs of consecutive rounds, as `(first, count)`."""
    size, rest = divmod(rounds, parts)
    counts = [size + (i < rest) for i in range(parts)]
    return [(sum(counts[:i]), count) for i, count in enumerate(counts) if count > 0]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.runner = Runner()
    await app.state.runner.start()
    yield
    app.state.runner.stop()


app = FastAPI(title="LolliPop service", lifespan=lifespan)


@app.middleware("http")
async def limit_body(request: Request, call_next):
    """Turns away large requests before reading them."""
    if request.method == "POST":
        length = request.headers.get("content-length", "")
        if not length.isdigit():
            return JSONResponse({"detail": "A Content-Length is required."}, 411)
        if int(length) > MAX_BODY_BYTES:
            return JSONResponse({"detail": f"At most {MAX_BODY_BYTES} bytes are allowed."}, 413)
    return await call_next(request)


# Added last, so that it wraps the other middleware: their answers get CORS headers, too.
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"])


@app.post("/deconvolve")
async def post_deconvolve(request: DeconvolutionRequest) -> DeconvolutionResponse:
    if len(request.frequencies) > MAX_FREQUENCIES:
        raise HTTPException(413, f"At most {MAX_FREQUENCIES} frequencies are allowed.")
    if len(request.signatures) > MAX_LINEAGES:
        raise HTTPException(413, f"At most {MAX_LINEAGES} lineages are allowed.")
    if request.options.bootstraps > MAX_BOOTSTRAPS:
        raise HTTPException(413, f"At most {MAX_BOOTSTRAPS} bootstrap rounds are allowed.")
    return await app.state.runner.run(request)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/version")
def get_version() -> dict[str, str]:
    return {"lollipop": version("lollipop")}
