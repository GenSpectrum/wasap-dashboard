import { describe, expect, it } from 'vitest';

import { effectivePanel, predefinedLineage } from './analysisFilter';

describe('effectivePanel', () => {
    const panel = ['XFG', 'NB.1.8.1'];

    it('is the panel without an extra lineage', () => {
        expect(effectivePanel(panel, { mode: 'deconvolution' })).toEqual(panel);
    });

    it('adds the extra lineage to the panel', () => {
        expect(effectivePanel(panel, { mode: 'deconvolution', extraLineage: 'XEC' })).toEqual([...panel, 'XEC']);
    });

    it("doesn't add an extra lineage that is in the panel already", () => {
        expect(effectivePanel(panel, { mode: 'deconvolution', extraLineage: 'XFG' })).toEqual(panel);
    });
});

describe('predefinedLineage', () => {
    it('leaves the * of a lineage query with its sublineages out', () => {
        expect(predefinedLineage('XFG*')).toBe('XFG');
    });

    it('is the lineage itself without a *', () => {
        expect(predefinedLineage('XFG')).toBe('XFG');
        expect(predefinedLineage(undefined)).toBeUndefined();
    });
});
