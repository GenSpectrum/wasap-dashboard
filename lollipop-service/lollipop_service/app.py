"""
The HTTP API: `POST /deconvolve` runs a deconvolution and answers with its result, synchronously.

A deconvolution takes from seconds to minutes and holds a CPU, so they run in a pool of
`LOLLIPOP_WORKERS` processes; when `LOLLIPOP_MAX_QUEUED` more are waiting, further requests get a
503. Every visitor of a dashboard page sends the same request, so results are cached, and a request
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

from .deconvolution import deconvolve
from .models import DeconvolutionRequest, DeconvolutionResponse


def _setting(name: str, default: int) -> int:
    return int(os.environ.get(f"LOLLIPOP_{name}", default))


WORKERS = _setting("WORKERS", os.cpu_count() or 1)
MAX_QUEUED = _setting("MAX_QUEUED", 2 * WORKERS)
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
            if len(self.running) >= WORKERS + MAX_QUEUED:
                raise HTTPException(503, "Too many deconvolutions are running, please try again later.")
            future = asyncio.get_running_loop().run_in_executor(self.executor, deconvolve, request)
            self.running[key] = future
            future.add_done_callback(lambda done: self._finished(key, done))
        # Shielded: a client that disconnects mustn't cancel the run for the others waiting on it.
        return await asyncio.shield(self.running[key])

    def _finished(self, key: str, future: asyncio.Future[DeconvolutionResponse]) -> None:
        del self.running[key]
        if not future.cancelled() and future.exception() is None:
            self.cache[key] = future.result()
            if len(self.cache) > CACHE_SIZE:
                self.cache.popitem(last=False)


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
