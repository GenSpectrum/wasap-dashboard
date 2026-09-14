# wasap-standalone

The GenSpectrum wastewater ("W-ASAP") dashboards as a standalone Vite + React
SPA, extracted from `GenSpectrum/dashboards` (an Astro app).

The plan lives in `~/standalone-wasap/`. This repo is being built up step by step;
each step lands as a reviewable series of PRs.

## Status

**Step 1a — scaffold.** Empty app: hash router, app shell, Tailwind v4 + daisyUI,
lint/format, CI. No wastewater code yet — that arrives in 1b (verbatim copy of the
dashboards code) and 1c (wiring, organism selector, test-infra port).

## Run modes (target)

1. **Hosted** — static SPA against a remote LAPIS/SILO over HTTP (like the current
   dashboards deployment).
2. **In-browser** — the SPA bundling a WASM SILO build, queries run client-side.
3. **Desktop (Tauri)** — the SPA shipped with a native SILO sidecar.

Only mode 1 is in scope for step 1.

## Development

```sh
npm install
npm run dev          # vite dev server
npm run build        # tsc --noEmit && vite build -> dist/
npm run preview      # serve the built bundle
npm test             # vitest (node project)
npm run typecheck
npm run format       # eslint . --fix && prettier --write .  (run before every commit)
npm run check-lint   # eslint ., no fixes
```

### Deploying to a sub-path

`vite build` reads `BASE_PATH` (e.g. `/wasap-standalone/`) for static hosts that
serve from a sub-path. Defaults to `/`.

## Repo setup

`origin` is a **local bare repo** at `~/repos/wasap-standalone.git`, matching the
convention for every repo on this machine (`~/repos/*.git`). It is local-only for
now; if the project moves to the `GenSpectrum` GitHub org, the GitHub URL is added
as a remote on the bare repo (see `~/standalone-wasap/06-cross-cutting-concerns.md`
§6.5 and open question 7).

Clone from the bare repo into `~/working-copies/wasap-standalone-<feature>` and
work on a named branch.

## Configuration

Runtime config (LAPIS / backend URLs, `dbIdSpace`, which organisms) lands in step
1c as a static TS config module plus a runtime `config.json`, defaulting to `prod`.
