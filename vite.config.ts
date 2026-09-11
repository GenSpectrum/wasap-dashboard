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
            // only ever called same-origin through the Astro `/api` proxy). In
            // dev, `config.local-dev.example.json` points `collectionsBackendUrl`
            // at this path so the browser talks same-origin and Vite forwards to
            // the real backend. A real deployment needs the backend to allow its
            // origin, or its own proxy — see standalone-wasap/09-third-party-hosting.md.
            //
            // Target is staging, not prod: local dev's own example config uses
            // staging's collection IDs (see `public/config.local-dev.example.json`),
            // and querying prod with staging IDs would return the wrong data —
            // that mismatch is exactly the bug the external-config-file split
            // was meant to fix.
            //
            // TODO(cors): this whole proxy is a workaround, not a design choice —
            // once the backend sends Access-Control-Allow-Origin (a fix in a
            // codebase we control), delete this block and point
            // `config.local-dev.example.json`'s `collectionsBackendUrl` straight
            // at `https://staging.genspectrum.org/api`.
            '/collections-backend': {
                target: 'https://staging.genspectrum.org/api',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/collections-backend/, ''),
            },
        },
    },
});
