"""
The HTTP API: `POST /deconvolve` runs a deconvolution and answers with its result, synchronously.

A deconvolution's bootstrap takes from seconds to minutes, so its rounds are split up between a
pool of `LOLLIPOP_WORKERS` processes, at most `LOLLIPOP_WORKERS_PER_REQUEST` of them per request:
on a big pool, several requests are computed side by side, otherwise they take turns. When
`LOLLIPOP_MAX_REQUESTS` are in progress, further requests get a 503.

Every visitor of a dashboard page sends the same request, so results are cached, and a request
that is already running is joined instead of run twice.
"""

import asyncio
import hashlib
import os
from collections import OrderedDict
from concurrent.futures import ProcessPoolExecutor
from contextlib import asynccontextmanager
from importlib.metadata import version

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from threadpoolctl import threadpool_limits

from .deconvolution import aggregate, fit_rounds
from .models import DeconvolutionRequest, DeconvolutionResponse


def _setting(name: str, default: int) -> int:
    return int(os.environ.get(f"LOLLIPOP_{name}", default))


WORKERS = _setting("WORKERS", os.cpu_count() or 1)
# Unlimited by default; the image sets 25 (see "Sizing" in README.md).
WORKERS_PER_REQUEST = _setting("WORKERS_PER_REQUEST", WORKERS)
MAX_REQUESTS = _setting("MAX_REQUESTS", 16)
CACHE_SIZE = _setting("CACHE_SIZE", 256)
MAX_FREQUENCIES = _setting("MAX_FREQUENCIES", 200_000)
MAX_LINEAGES = _setting("MAX_LINEAGES", 50)
MAX_BOOTSTRAPS = _setting("MAX_BOOTSTRAPS", 1000)
# Comma-separated, like `https://wasap.genspectrum.org`; `*` (the default) allows every origin.
CORS_ORIGINS = os.environ.get("LOLLIPOP_CORS_ORIGINS", "*").split(",")


def _init_worker() -> None:
    # One BLAS thread per process: the pool already keeps every CPU busy.
    threadpool_limits(1)


class Runner:
    def __init__(self, executor: ProcessPoolExecutor):
        self.executor = executor
        self.cache: OrderedDict[str, DeconvolutionResponse] = OrderedDict()
        self.running: dict[str, asyncio.Future[DeconvolutionResponse]] = {}

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
        loop = asyncio.get_running_loop()
        parts = await asyncio.gather(
            *(
                loop.run_in_executor(self.executor, fit_rounds, request, first, count)
                for first, count in _split(request.options.bootstraps, min(WORKERS, WORKERS_PER_REQUEST))
            )
        )
        return aggregate(request, [fit for part in parts for fit in part])

    def _finished(self, key: str, future: asyncio.Future[DeconvolutionResponse]) -> None:
        del self.running[key]
        if not future.cancelled() and future.exception() is None:
            self.cache[key] = future.result()
            if len(self.cache) > CACHE_SIZE:
                self.cache.popitem(last=False)


def _split(rounds: int, parts: int) -> list[tuple[int, int]]:
    """`rounds` split into at most `parts` runs of consecutive rounds, as `(first, count)`."""
    size, rest = divmod(rounds, parts)
    counts = [size + (i < rest) for i in range(parts)]
    return [(sum(counts[:i]), count) for i, count in enumerate(counts) if count > 0]


@asynccontextmanager
async def lifespan(app: FastAPI):
    with ProcessPoolExecutor(WORKERS, initializer=_init_worker) as executor:
        app.state.runner = Runner(executor)
        yield


app = FastAPI(title="LolliPop service", lifespan=lifespan)
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
