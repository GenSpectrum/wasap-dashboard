# Wastewater Analytics

The W-ASAP dashboard is an interactive dashboard for exploring swiss wastewater sequencing data.
It enables monitoring of known variants and discovery of emerging variants.
Additionally, it allows experts to break down a variant's signal by amplicon and mutational information.

## Development

The application is a **Vite + React SPA**.

```sh
npm install
npm run dev           # vite dev server, http://localhost:4321
npm run build         # tsc --noEmit && vite build -> dist/
npm run preview       # serve the built bundle
npm test              # vitest, node + browser projects
npm run test:watch    # vitest in watch mode
npm run typecheck
npm run format         # eslint . --fix && prettier --write .  (run before every commit)
npm run check-lint     # eslint ., no fixes
npm run check-format   # prettier --check ., no fixes
```

Tests run as two Vitest projects — `node` and `browser` (Playwright-driven, for
`*.browser.spec.tsx` component tests). `npm test` runs both; CI additionally
installs the Playwright browser first (see `.github/workflows/ci.yml`).

### Configuration

Runtime config is a `config.json` containing:

- LAPIS/RhyDB/backend URLs
- per-organism settings
- the enabled analysis modes

An example config can be found in `public/config.example.json`. If no config is found, the website will display an error.

An organism can name the primer scheme its data was sequenced with, under
`amplicons`: either a vendored scheme (`{ "scheme": "artic-sars-cov-2/400/v5.3.2" }`,
see `public/primers/`) or a primer BED file of its own (`{ "bedFile": "…" }`).
Without it, the amplicon features are off for that organism.

### Deploying to a sub-path

`vite build` reads `BASE_PATH` (e.g. `/wasap-dashboard/`) for static hosts
that serve from a sub-path. Defaults to `/`.

### URLs

The bare `/<organism>` is the organism's overview page displaying whole-instance stats and
an unfiltered table of its sampling locations.

Every organism also has a page per analysis mode: `/<organism>/<mode>`, for example `/covid/manual`,
`/covid/variantExplorer`, `/covid/resistance`, `/covid/untracked`, `/covid/collection`,
`/covid/lineagePrevalence`, and `/covid/cooccurrence`. The modes are the ones that are enabled
in the organism's config.
Location, sampling date and granularity are search params that stay the same when going from one
mode to another.
The settings of a mode are search params of its own page.

### SPA fallback

Routing is real paths (`react-router-dom` v7, `createBrowserRouter`), not hash
routing, so the host must serve `index.html` for unmatched paths. On nginx,
one line in the `location` block does it:

```nginx
location / {
    try_files $uri /index.html;
}
```

Other hosts need the equivalent.

## Running with Docker

```sh
cp public/config.example.json config.json   # then edit config.json
docker compose up --build
```

Serves the app at `http://localhost:8080` and the LolliPop service
([`lollipop-service/`](lollipop-service/README.md)), which the Lineage Prevalence page needs,
at `http://localhost:8000`. To use the local service, set `lollipopServiceUrl` to
`http://localhost:8000`. The example configs point at the deployed one. `config.json` is
bind-mounted, so editing it and restarting the container is enough. No rebuild is needed.

CI publishes both images on every push to `main`:
`ghcr.io/genspectrum/wasap-dashboard` and `ghcr.io/genspectrum/wasap-dashboard-lollipop-service`.

## Source layout

```
src/
  routes/          the pages: organism overview, mode pages, about
  components/      React components; modes/<mode>/ holds what only one mode uses
  pageState/       each mode page's state, kept in the URL search params
  dataLayer/       RhyDB: HTTP client, SaneQL queries, React Query hooks
  externalData/    everything else loaded from outside: clinical LAPIS, collections
                   backends, LolliPop service, static files (primers, genome, lineage tree)
  domain/          domain data structures (mutations, date ranges, temporal buckets, …)
  config/          config.json loading and schema
  util/, test/     generic helpers, test setup
lollipop-service/  the Python service behind the Lineage Prevalence page
```

Imports only go downwards: `routes/` + `components/` → `pageState/` → `dataLayer/` +
`externalData/` → `domain/` → `util/`. ESLint enforces it (`import/no-restricted-paths`).

## License

AGPL-3.0-only (see [`LICENSE`](LICENSE)).
