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
        proxy: {
            // The GenSpectrum collections backend has no CORS headers (it was
            // only ever called same-origin through the Astro `/api` proxy). In
            // dev, appConfig points `collectionsBackendUrl` at this path so the
            // browser talks same-origin and Vite forwards. A real deployment
            // needs the backend to allow its origin, or its own proxy — see
            // standalone-wasap/09-third-party-hosting.md.
            '/collections-backend': {
                target: 'https://genspectrum.org/api',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/collections-backend/, ''),
            },
        },
    },
});
