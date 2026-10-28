# Wastewater Analytics

The GenSpectrum wastewater ("W‑ASAP") dashboards as a standalone **Vite + React
SPA**, extracted from `GenSpectrum/dashboards`. Renders the
`covid` / `rsvA` / `rsvB` wastewater dashboards — organism dropdown, six
analysis modes (manual, variant, resistance, untracked, collection,
co-occurrence), mutations-/queries-over-time grids.

From a service to a tool: today this hosts _our_ data for _our_ users. The goal
is a tool other people can point at their own data, in three run modes:

1. **Hosted** — a statically served SPA talking to a remote LAPIS/RhyDB over
   HTTP (how it runs today).
2. **In-browser** — the same SPA bundling a WASM build of RhyDB
   (`@rhydb/rhydb-wasm`), queries run entirely client-side against a dataset
   loaded in the browser. Blocked on an upstream 64-bit WASM RhyDB build — see
   [`ROADMAP.md`](ROADMAP.md).
3. **Desktop (Tauri)** — the SPA shipped with a dedicated native RhyDB process.
   Not started — see [`ROADMAP.md`](ROADMAP.md).

Only mode 1 is built today.

## Development

```sh
npm install
npm run dev           # vite dev server, http://localhost:4321
npm run build         # tsc --noEmit && vite build -> dist/
npm run preview       # serve the built bundle
npm test              # vitest (node project)
npm run typecheck
npm run format         # eslint . --fix && prettier --write .  (run before every commit)
npm run check-lint     # eslint ., no fixes
npm run check-format   # prettier --check ., no fixes
```

Tests run as two Vitest projects — `node` and `browser` (Playwright-driven, for
`*.browser.spec.tsx` component tests). `npm test` runs both; CI additionally
installs the Playwright browser first (see `.github/workflows/ci.yml`).

### Configuration

Runtime config — LAPIS/RhyDB/backend URLs, per-organism settings, which
analysis modes are enabled — is a `config.json` fetched at startup and
zod-validated (`src/config/`). `public/config.example.json` documents the
shape; the real file is gitignored. No config present ⇒ the app renders with
no organisms (fail loud, not a hardcoded default).

An organism can name the primer scheme its data was sequenced with, under
`amplicons`: either a vendored scheme (`{ "scheme": "artic-sars-cov-2/400/v5.3.2" }`,
see `public/primers/`) or a primer BED file of its own (`{ "bedFile": "…" }`).
Without it, the amplicon features are off for that organism.

### Deploying to a sub-path

`vite build` reads `BASE_PATH` (e.g. `/wasap-dashboard/`) for static hosts
that serve from a sub-path. Defaults to `/`.

### URLs

The bare `/<organism>` is the organism's overview page (whole-instance stats and a table of
its sampling locations, unfiltered) — the first tab, and the landing page. Every organism also
has a page per analysis mode: `/<organism>/<mode>`, for example `/covid/manual`,
`/covid/variantExplorer`, `/covid/resistance`, `/covid/untracked`, `/covid/collection`,
`/covid/lineagePrevalence`, and `/covid/cooccurrence`. The modes are the ones that are enabled
in the organism's config; a `/<organism>/<mode>` URL whose mode isn't one of them shows a 404.
Location, sampling date and granularity are search params that stay the same when going from one
mode to another (the overview page ignores them); the settings of a mode are search params of its
own page. The collection mode itself has two sources, GenSpectrum's own collections (always
available) and CoV-Spectrum's (an organism-level opt-in, since not every organism has a
CoV-Spectrum instance) — which one is picked is a `source` search param of that page, not a
separate mode.

### SPA fallback

Routing is real paths (`react-router-dom` v7, `createBrowserRouter`), not hash
routing, so the host must serve `index.html` for unmatched paths. On nginx,
one line in the `location` block does it:

```nginx
location / {
    try_files $uri /index.html;
}
```

Other hosts need the equivalent (Tauri's custom-protocol handler is a
separate case — see `ROADMAP.md`, step 4).

## Running with Docker

```sh
cp public/config.example.json config.json   # then edit config.json
docker compose up --build
```

Serves the app at `http://localhost:8080`, and the LolliPop service
([`lollipop-service/`](lollipop-service/README.md)), which the Lineage
Prevalence page needs, at `http://localhost:8000`. The example configs use the
deployed service, `https://dashboard.wasap.genspectrum.org/lollipop`; set
`lollipopServiceUrl` to `http://localhost:8000` to use the local one. Without a
`lollipopServiceUrl`, that page is left out.
`docker-compose.yml` bind-mounts
`./config.json` into the built image, so editing it and restarting the
container is enough to point the same image at different data — no rebuild
needed.

CI publishes the image to `ghcr.io/genspectrum/wasap-dashboard` on every push
to `main`, so `--build` above can be swapped for `image:
ghcr.io/genspectrum/wasap-dashboard:latest` in `docker-compose.yml` to skip
building locally. The LolliPop service's image is published next to it, as
`ghcr.io/genspectrum/wasap-dashboard-lollipop-service`, with the same tags.

## Source layout

```
src/
  main.tsx, AppShell.tsx    entry point + top-level chrome (organism dropdown)
  routes/                   OrganismRoute (per-organism config, resistance data, lineage tree),
                            ModeRoute (the page of the mode in the URL)
  pageState/          the page state of the mode pages: a handler per mode + the shared base filter
  components/
    modes/<mode>/           what only one mode uses: its page, filter, results
    layout/                 app shell, mode page layout, header, result states
    filterSidebar/          the filter sidebar + shared field help texts
    inputs/                 generic filter widgets
    overTime/               over-time grids, their view settings, ProportionValue
    mutations/              mutation display, annotations, sorting
    ui/                     generic UI: modal, tooltip, dropdown, errors, loading
  dataLayer/
    transport/               the SaneQL AST builder + RhyDB HTTP client (vendored
                             from wastewater-analytics-experiment): connection,
                             retry, concurrency limit
    queries/                 SaneQL query catalogue + RhydbReadFilter + per-organism
                             RhydbSchema (dict- vs. DATE32-encoded date columns)
    hooks/                   the RhyDB React Query hooks: connection + query plumbing,
      lookups/               small single-query reads (date extent, counts, options, …)
      analyses/              the analysis hooks (mutations / queries over time,
                             co-occurrence, amplicon coverage, …)
  externalData/             everything loaded from outside the app: clinical
                             LAPIS, the W-ASAP LAPIS (query/parse only),
                             GenSpectrum collections backend, cov-spectrum
                             collections
    lollipop/               the client of the LolliPop service (`lollipop-service/`)
    fileBased/              data loaded from static files: amplicons (primer
                             BEDs), genome (Nextclade gene annotation),
                             lineageTree (Nextclade tree.json, alias key,
                             lineage signatures, panel matching)
  config/                   config.json loading + schema, per-organism types
  logging.ts, index.css, types/, util/
lollipop-service/           the service that computes the Lineage Prevalence page with
                            LolliPop — Python, its own image, see lollipop-service/README.md
```

## License

AGPL-3.0-only (see [`LICENSE`](LICENSE)).

## Further reading

- [`ROADMAP.md`](ROADMAP.md) — what's built, what's left, and the open product
  questions that block committing to the rest.
- `TODO.md` — small in-progress code-level cleanups, not roadmap items.
