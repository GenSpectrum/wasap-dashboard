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
confidence level. Invalid requests get a 422, too large ones a 413, and a 503 when too many
deconvolutions are already running. The same request always gets the same answer, so results are
cached.

`GET /health` and `GET /version` (the LolliPop version) are there for monitoring. Interactive docs
are at `/docs`.

## Configuration

Environment variables:

| Variable                   | Default        | Meaning                                                                      |
| -------------------------- | -------------- | ---------------------------------------------------------------------------- |
| `LOLLIPOP_WORKERS`         | number of CPUs | processes the rounds of a bootstrap are split between                        |
| `LOLLIPOP_MAX_QUEUED`      | 8              | requests waiting behind the one being computed before further ones get a 503 |
| `LOLLIPOP_CACHE_SIZE`      | 256            | results kept in memory                                                       |
| `LOLLIPOP_MAX_FREQUENCIES` | 200000         | per request                                                                  |
| `LOLLIPOP_MAX_LINEAGES`    | 50             | per request                                                                  |
| `LOLLIPOP_MAX_BOOTSTRAPS`  | 1000           | per request                                                                  |
| `LOLLIPOP_CORS_ORIGINS`    | `*`            | comma-separated origins allowed to call the service from a browser           |

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
