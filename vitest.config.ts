import { playwright } from '@vitest/browser-playwright';
import { configDefaults, defineConfig } from 'vitest/config';

const BROWSER_SPEC_PATTERNS = ['src/**/*.browser.{test,spec}.tsx'];

// Two projects:
//   - node:    plain-logic + hook + data-layer specs (jsdom-free, MSW via msw/node)
//   - browser: *.browser.spec.tsx component tests, real Chromium via Playwright
//
// Run one with `vitest --project node` / `--project browser`; CI runs both and
// installs the Playwright browser first. See
// standalone-wasap/06-cross-cutting-concerns.md §6.4.
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
                // Found only while the tests run otherwise, which re-bundles the dependencies half-way
                // and leaves two copies of React ("Invalid hook call").
                optimizeDeps: { include: ['react-router-dom'] },
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
