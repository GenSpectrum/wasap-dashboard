import { playwright } from '@vitest/browser-playwright';
import { configDefaults, defineConfig } from 'vitest/config';

// Ported from the dashboards repo. Two projects:
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
                    exclude: [...configDefaults.exclude, 'src/**/*.browser.{test,spec}.tsx'],
                    setupFiles: 'vitest.setup.ts',
                },
            },
            {
                test: {
                    name: 'browser',
                    include: ['src/**/*.browser.{test,spec}.tsx'],
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
