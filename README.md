# Wastewater Analytics

The GenSpectrum wastewater ("W‑ASAP") dashboards as a standalone **Vite + React
SPA**, extracted from `GenSpectrum/dashboards` (an Astro app). Renders the
`covid` / `rsvA` / `rsvB` wastewater dashboards — organism dropdown, six
analysis modes (manual, variant, resistance, untracked, collection,
covSpectrumCollection), mutations-/queries-over-time grids — without Astro.

From a service to a tool: today this hosts _our_ data for _our_ users. The goal
is a tool other people can point at their own data, in three run modes:

1. **Hosted** — a statically served SPA talking to a remote LAPIS/SILO over
   HTTP (how it runs today).
2. **In-browser** — the same SPA bundling a WASM build of SILO
   (`@rhydb/rhydb-wasm`), queries run entirely client-side against a dataset
   loaded in the browser. Blocked on an upstream 64-bit WASM SILO build — see
   [`ROADMAP.md`](ROADMAP.md).
3. **Desktop (Tauri)** — the SPA shipped with a dedicated native SILO process.
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

Runtime config — LAPIS/SILO/backend URLs, per-organism settings, which
analysis modes are enabled — is a `config.json` fetched at startup and
zod-validated (`src/config/`). `public/config.example.json` documents the
shape; the real file is gitignored. No config present ⇒ the app renders with
no organisms (fail loud, not a hardcoded default).

### Deploying to a sub-path

`vite build` reads `BASE_PATH` (e.g. `/wasap-dashboard/`) for static hosts
that serve from a sub-path. Defaults to `/`.

### URLs

Every organism has a page per analysis mode: `/<organism>/<mode>`, for example
`/covid/manual`, `/covid/variantExplorer`, `/covid/resistance`, `/covid/untracked`,
`/covid/collection` and `/covid/covSpectrumCollection`. The modes are the ones that are enabled
in the organism's config. The bare `/<organism>` goes to the `defaultAnalysisMode` of the
config, or else the first enabled mode. Location, sampling date and granularity are search
params that stay the same when going from one mode to another; the settings of a mode are search
params of its own page.

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

Serves the app at `http://localhost:8080`. `docker-compose.yml` bind-mounts
`./config.json` into the built image, so editing it and restarting the
container is enough to point the same image at different data — no rebuild
needed.

CI publishes the image to `ghcr.io/genspectrum/wasap-dashboard` on every push
to `main`, so `--build` above can be swapped for `image:
ghcr.io/genspectrum/wasap-dashboard:latest` in `docker-compose.yml` to skip
building locally.

## Source layout

```
src/
  main.tsx, AppShell.tsx    entry point + top-level chrome (organism dropdown)
  routes/                   WasapRoute (fetches resistance data, wires per-organism config)
  views/                    WasapPageStateHandler + the per-mode page-state logic
  layouts/                  page layout wrappers
  components/               the ported dashboard-components fork — filters,
                             over-time grids, gs-* wrappers
  dataLayer/
    transport/               the SaneQL AST builder + SILO HTTP client (vendored
                             from wastewater-analytics-experiment): connection,
                             retry, concurrency limit
    queries/                 SaneQL query catalogue + SiloReadFilter + per-organism
                             SiloSchema (dict- vs. DATE32-encoded date columns)
    hooks/                   the Tier-1 + over-time React Query hooks
  query/                    legacy LAPIS-era serializer helpers, slimmed down
                             but still shared by the over-time views
                             (ProportionValue, getProportion, hideGapsInPlace)
  externalData/             everything that talks to a remote HTTP API: clinical
                             LAPIS, the W-ASAP LAPIS (query/parse only),
                             GenSpectrum collections backend, cov-spectrum
                             collections
  config/                   config.json loading + schema, per-organism types
  clientLogger.ts, types/, util/, styles/
```

## Further reading

- [`ROADMAP.md`](ROADMAP.md) — what's built, what's left, and the open product
  questions that block committing to the rest.
- `TODO.md` — small in-progress code-level cleanups, not roadmap items.
