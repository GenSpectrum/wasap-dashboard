import { describe, expect, test } from 'vitest';

import { resolveUnresolvedOrganism, type WastewaterOrganismEntry } from './wastewaterOrganisms';
import type { WasapPageConfig } from '../components/views/wasap/wasapPageConfig';

function entry(pathSegment: string): WastewaterOrganismEntry {
    return { pathSegment, config: { path: `/swiss-wastewater/${pathSegment}` } as WasapPageConfig };
}

describe('resolveUnresolvedOrganism', () => {
    test('no organisms configured at all -> empty, regardless of what was requested', () => {
        expect(resolveUnresolvedOrganism([], undefined)).toEqual({ type: 'empty' });
        expect(resolveUnresolvedOrganism([], 'covid')).toEqual({ type: 'empty' });
    });

    test('unknown path segment, "covid" configured -> redirect to covid', () => {
        const organisms = [entry('covid'), entry('rsv-a')];
        expect(resolveUnresolvedOrganism(organisms, 'not-a-real-organism')).toEqual({
            type: 'redirect',
            pathSegment: 'covid',
        });
    });

    test('"covid" not configured -> redirect to the first configured organism instead', () => {
        const organisms = [entry('rsv-a'), entry('rsv-b')];
        expect(resolveUnresolvedOrganism(organisms, 'not-a-real-organism')).toEqual({
            type: 'redirect',
            pathSegment: 'rsv-a',
        });
    });

    test('already at the computed fallback and it still does not resolve -> empty, not another redirect', () => {
        // Only realistic if config.json has inconsistent path segments, but the
        // caller must not loop a redirect to the same place it's already at.
        const organisms = [entry('covid')];
        expect(resolveUnresolvedOrganism(organisms, 'covid')).toEqual({ type: 'empty' });
    });
});
