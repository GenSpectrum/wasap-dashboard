import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// BASE_PATH is set by a static-host deploy workflow to "/<repo-name>/" when the
// app is not served from the domain root. Defaults to "/" for local dev, Tauri,
// and root deploys.
export default defineConfig({
    base: process.env.BASE_PATH ?? '/',
    plugins: [react(), tailwindcss()],
});
