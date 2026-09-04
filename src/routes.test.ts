import { describe, expect, it } from 'vitest';

import { routes } from './routes';

// A smoke test so `npm test` / CI has something real to run on the scaffold.
// Replaced by the ported dashboards test suite in step 1c.
describe('routes', () => {
    it('mounts the app shell at the root with an index child', () => {
        expect(routes).toHaveLength(1);
        const root = routes[0]!;
        expect(root.path).toBe('/');
        expect(root.children?.some((child) => child.index)).toBe(true);
    });
});
