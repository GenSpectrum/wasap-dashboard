import { describe, expect, it } from 'vitest';

import { effectivePanel } from './wasapAnalysisFilter';

describe('effectivePanel', () => {
    const panel = ['XFG', 'NB.1.8.1'];

    it('is the panel without an extra lineage', () => {
        expect(effectivePanel({ mode: 'deconvolution', panel })).toEqual(panel);
    });

    it('adds the extra lineage to the panel', () => {
        expect(effectivePanel({ mode: 'deconvolution', panel, extraLineage: 'XEC' })).toEqual([...panel, 'XEC']);
    });

    it("doesn't add an extra lineage that is in the panel already", () => {
        expect(effectivePanel({ mode: 'deconvolution', panel, extraLineage: 'XFG' })).toEqual(panel);
    });
});
