# LolliPop service

An HTTP service that runs [LolliPop](https://github.com/cbg-ethz/LolliPop)'s deconvolution for the
dashboard's Lineage Prevalence page: the dashboard sends the signatures of a panel of lineages and
the mutation frequencies of the samples, and the service answers with each lineage's estimated
share per date. It runs what LolliPop's `deconvolute` command does with a bootstrap preset (like
`deconv_bootstrap_cowwid`), for a single location.

## API

`POST /deconvolve`, synchronous — with the default 100 bootstrap rounds, a request takes from
seconds to about a minute:

```json
{
    "signatures": { "XFG": ["G3431T", "T3565C"], "NB.1.8.1": ["C1170T"] },
    "frequencies": [{ "date": "2026-09-01", "mutation": "G3431T", "frac": 0.42 }],
    "options": { "bandwidth": 10, "minTol": 0.001, "fScale": 0.01, "bootstraps": 100, "confidenceLevel": 0.95 }
}
```

The order of `signatures` is the order of the result; `options` defaults to the
`deconv_bootstrap_cowwid` preset. The answer:

```json
{
    "variants": ["XFG", "NB.1.8.1", "undetermined"],
    "dates": [
        {
            "date": "2026-09-01",
            "estimates": [{ "variant": "XFG", "proportion": 0.4, "lower": 0.35, "upper": 0.46 }]
        }
    ]
}
```

`proportion` is the mean of the bootstrap rounds, `lower` and `upper` their quantiles for the
confidence level. Invalid requests get a 422, too large ones a 413 (and ones without a
`Content-Length` a 411), and a 503 when too many deconvolutions are already running or one takes
longer than the time limit. The same request always gets the same answer, whatever the order of its
frequencies and mutations, so results are cached.

If a process of the pool dies (killed for lack of memory, say), the pool is replaced, and the
requests it was computing are retried on the new one.

`GET /health` and `GET /version` (the LolliPop version) are there for monitoring. Interactive docs
are at `/docs`.

## Configuration

Environment variables:

| Variable                       | Default                    | Meaning                                                                            |
| ------------------------------ | -------------------------- | ---------------------------------------------------------------------------------- |
| `LOLLIPOP_WORKERS`             | number of CPUs             | processes in the pool, one CPU each                                                |
| `LOLLIPOP_WORKERS_PER_REQUEST` | unlimited, 25 in the image | processes one request's bootstrap is split between                                 |
| `LOLLIPOP_MAX_REQUESTS`        | 16                         | different requests in progress (computed or waiting) before further ones get a 503 |
| `LOLLIPOP_TIMEOUT`             | 300                        | seconds a request may take, waiting included, before it is given up with a 503     |
| `LOLLIPOP_CACHE_SIZE`          | 256                        | results kept in memory                                                             |
| `LOLLIPOP_MAX_BODY_BYTES`      | 10000000                   | per request, checked before reading it                                             |
| `LOLLIPOP_MAX_FREQUENCIES`     | 100000                     | per request                                                                        |
| `LOLLIPOP_MAX_LINEAGES`        | 50                         | per request                                                                        |
| `LOLLIPOP_MAX_BOOTSTRAPS`      | 200                        | per request                                                                        |
| `LOLLIPOP_CORS_ORIGINS`        | `*`                        | comma-separated origins allowed to call the service from a browser                 |

`LOLLIPOP_WORKERS` counts the CPUs of the host, also in a container: when a container is
limited to fewer CPUs, set it to that number.

### Sizing

The rounds of a request's bootstrap are split between `LOLLIPOP_WORKERS_PER_REQUEST` processes of
the pool. The pool takes the parts in the order they come in: a request uses up to that many
processes, and the rest of the pool computes other requests at the same time; when it is full,
requests wait for their turn.

Measured on a Ryzen 5 3600 (6 cores, 12 threads) with a real request (Zürich, 90 days, a panel of
8 lineages, 2324 frequencies, 100 rounds): a round takes about 0.34 s, and a process's fixed cost
for the request about 25 ms. The time falls about linearly with the processes, up to the physical
cores; hyperthreads add nothing:

| Workers | 1    | 2    | 3    | 4   | 6   | 8   | 12  |
| ------- | ---- | ---- | ---- | --- | --- | --- | --- |
| Time    | 34 s | 17 s | 12 s | 9 s | 7 s | 7 s | 7 s |

So set `LOLLIPOP_WORKERS` to the physical cores the service may use. More than about 25 processes
per request gain little — with 100 rounds, 25 do 4 each (about 1.5 s), 50 do 2 each — which is why
the image caps a request at 25: on a large server (like 96 cores), about 4 requests are then
computed side by side, at about 1.5 s each. Each process takes about 70 MB of memory.

## Development

With [uv](https://docs.astral.sh/uv/):

```sh
uv sync
uv run uvicorn lollipop_service.app:app --reload   # http://localhost:8000
uv run pytest
uv run ruff format && uv run ruff check --fix      # format and lint
```

The container listens on port 8000:

```sh
docker build -t lollipop-service . && docker run -p 8000:8000 lollipop-service
```
