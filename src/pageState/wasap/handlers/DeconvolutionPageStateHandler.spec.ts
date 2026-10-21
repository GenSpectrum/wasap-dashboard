import { describe, expect, it } from 'vitest';

import { DeconvolutionPageStateHandler } from './DeconvolutionPageStateHandler';
import { testConfigWithDeconvolution } from '../wasapTestConfig';

describe('DeconvolutionPageStateHandler', () => {
    const handler = new DeconvolutionPageStateHandler(testConfigWithDeconvolution);

    const parse = (query: string) => handler.parsePageStateFromUrl(new URLSearchParams(query));

    it('lives at the lineagePrevalence segment below the path of the organism', () => {
        expect(handler.getDefaultPageUrl()).toBe('/wastewater/covid/lineagePrevalence');
    });

    it('takes the panel from the config, without an extra lineage when the URL has none', () => {
        expect(parse('').analysis).toEqual({ mode: 'deconvolution', panel: ['XFG', 'NB.1.8.1'] });
    });

    it('ignores a panel in the URL', () => {
        expect(parse('panel=LP.8.1|XEC').analysis.panel).toEqual(['XFG', 'NB.1.8.1']);
    });

    it('parses the extra lineage from the URL', () => {
        expect(parse('extraLineage=LP.8.1').analysis.extraLineage).toBe('LP.8.1');
    });

    it('round-trips the extra lineage, and leaves it out of the URL when there is none', () => {
        expect(handler.toSearchParams(parse('extraLineage=XEC')).get('extraLineage')).toBe('XEC');
        expect(handler.toSearchParams(parse('')).has('extraLineage')).toBe(false);
    });

    it('has no mean proportion in the URL', () => {
        expect(
            handler.toSearchParams(parse('extraLineage=XEC&meanProportionLower=0.2')).has('meanProportionLower'),
        ).toBe(false);
    });
});
