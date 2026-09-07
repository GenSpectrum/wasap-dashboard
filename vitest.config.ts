import { resolve } from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import { configDefaults, defineConfig } from 'vitest/config';

const BROWSER_SPEC_PATTERNS = ['src/**/*.browser.{test,spec}.tsx', 'components/**/*.browser.{test,spec}.tsx'];

// Mirrors the alias in vite.config.ts — see the comment there. `import.meta.dirname`, not
// `__dirname`: vitest's config loader runs this as native ESM, where `__dirname` is undefined.
// Set on each project below, not just the root — inline `test.projects` entries don't inherit the
// root config's `resolve`.
const resolveAlias = { 'wasap-components': resolve(import.meta.dirname, 'components') };

// Two projects:
//   - node:    plain-logic + hook + data-layer specs (jsdom-free, MSW via msw/node)
//   - browser: *.browser.spec.tsx component tests, real Chromium via Playwright
//
// Both projects also cover components/ — the dashboard-components code — not just src/.
//
// Run one with `vitest --project node` / `--project browser`; CI runs both and
// installs the Playwright browser first. See
// standalone-wasap/06-cross-cutting-concerns.md §6.4.
export default defineConfig({
    resolve: { alias: resolveAlias },
    test: {
        passWithNoTests: true,
        projects: [
            {
                resolve: { alias: resolveAlias },
                test: {
                    name: 'node',
                    exclude: [...configDefaults.exclude, ...BROWSER_SPEC_PATTERNS],
                    setupFiles: 'vitest.setup.ts',
                },
            },
            {
                resolve: { alias: resolveAlias },
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
