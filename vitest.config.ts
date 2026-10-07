import { playwright } from '@vitest/browser-playwright';
import { configDefaults, defineConfig } from 'vitest/config';

import packageJson from './package.json' with { type: 'json' };

const BROWSER_SPEC_PATTERNS = ['src/**/*.browser.{test,spec}.tsx'];

// What the browser specs import from node_modules, so that Vite pre-bundles all of it before the
// tests start. Vite only scans for dependencies when it has no cache yet; with a cache, it finds a
// dependency the cache lacks only once a spec imports it, then re-bundles and reloads the test
// pages half-way through the run. That's what made the browser tests flaky: specs failing with
// "Failed to fetch dynamically imported module", runs hanging, or two copies of React ("Invalid
// hook call"). The dependencies of package.json are covered as they are added; a new subpath
// import (like `dayjs/esm/...`) or test library has to be added here.
const BROWSER_PREBUNDLED_DEPENDENCIES = [
    ...Object.keys(packageJson.dependencies),
    'dayjs/esm',
    'dayjs/esm/plugin/advancedFormat',
    'dayjs/esm/plugin/isoWeek',
    'react-dom/client',
    'react/jsx-dev-runtime',
    'zod/v4',
    '@testing-library/jest-dom/vitest',
    '@testing-library/react',
    'vitest-browser-react',
];

// Two projects:
//   - node:    plain-logic + hook + data-layer specs (jsdom-free, MSW via msw/node)
//   - browser: *.browser.spec.tsx component tests, real Chromium via Playwright
//
// Run one with `vitest --project node` / `--project browser`; CI runs both and
// installs the Playwright browser first.
export default defineConfig({
    test: {
        passWithNoTests: true,
        projects: [
            {
                test: {
                    name: 'node',
                    exclude: [...configDefaults.exclude, ...BROWSER_SPEC_PATTERNS],
                    setupFiles: 'vitest.setup.ts',
                },
            },
            {
                optimizeDeps: { include: BROWSER_PREBUNDLED_DEPENDENCIES },
                test: {
                    name: 'browser',
                    include: BROWSER_SPEC_PATTERNS,
                    browser: {
                        provider: playwright(),
                        enabled: true,
                        headless: true,
                        instances: [{ browser: 'chromium' }],
                    },
                },
            },
        ],
    },
});
