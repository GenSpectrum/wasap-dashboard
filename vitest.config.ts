import { defineConfig } from 'vitest/config';

// Scaffold: a single node project for plain-logic tests.
//
// Step 1c ports the full dashboards Vitest setup on top of this — a second
// `browser` project (Playwright provider) for the `*.browser.spec.tsx`
// component tests, MSW, and the `routeMocker.ts` stack. See
// `standalone-wasap/06-cross-cutting-concerns.md` §6.4.
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.{ts,tsx}'],
    },
});
