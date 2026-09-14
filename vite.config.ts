import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// BASE_PATH is set by a static-host deploy workflow to "/<repo-name>/" when the
// app is not served from the domain root. Defaults to "/" for local dev, Tauri,
// and root deploys.
export default defineConfig({
    base: process.env.BASE_PATH ?? '/',
    plugins: [react(), tailwindcss()],
    server: {
        // Match the port the Astro `dashboards` app uses, so muscle memory and
        // any bookmarks carry over.
        port: 4321,
        proxy: {
            // The GenSpectrum collections backend has no CORS headers (it was
            // only ever called same-origin through the Astro `/api` proxy). Each
            // path below lets one example config's `collectionsBackendUrl` reach
            // a specific instance same-origin, with Vite forwarding server-side.
            // A real deployment needs the backend to allow its origin, or its own
            // proxy — see standalone-wasap/09-third-party-hosting.md.
            //
            // TODO(cors): both of these are a workaround, not a design choice —
            // once the backend sends Access-Control-Allow-Origin (a fix in a
            // codebase we control), delete this whole `proxy` block and point
            // `config.local-dev.example.json` / `config.demo.example.json`'s
            // `collectionsBackendUrl` straight at the real URLs below.

            // Order matters: Vite matches proxy paths by prefix, in the order
            // they're declared, and `/collections-backend` is itself a prefix of
            // `/collections-backend-prod` — so the more specific path has to come
            // first, or every `-prod` request would match the shorter rule instead.

            // `config.demo.example.json` — prod's collection IDs, for demoing
            // real data locally without prod's CORS gap blocking the browser.
            '/collections-backend-prod': {
                target: 'https://genspectrum.org/api',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/collections-backend-prod/, ''),
            },
            // `config.local-dev.example.json` — staging's collection IDs, so this
            // has to hit staging: querying prod with staging IDs returns the
            // wrong data, the exact mismatch the external-config-file split was
            // meant to prevent.
            '/collections-backend': {
                target: 'https://staging.genspectrum.org/api',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/collections-backend/, ''),
            },
        },
    },
});
