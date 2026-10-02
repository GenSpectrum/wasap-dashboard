import { describe, expect, it } from 'vitest';

import { DeconvolutionPageStateHandler } from './DeconvolutionPageStateHandler';
import { testConfigWithDeconvolution } from '../wasapTestConfig';

describe('DeconvolutionPageStateHandler', () => {
    const handler = new DeconvolutionPageStateHandler(testConfigWithDeconvolution);

    const parse = (query: string) => handler.parsePageStateFromUrl(new URLSearchParams(query));

    it('lives at the lineagePrevalence segment below the path of the organism', () => {
        expect(handler.getDefaultPageUrl()).toBe('/wastewater/covid/lineagePrevalence');
    });

    it('takes the panel from the config when the URL has none', () => {
        expect(parse('').analysis).toEqual({ mode: 'deconvolution', panel: ['XFG', 'NB.1.8.1'] });
    });

    it('parses the panel from the URL', () => {
        expect(parse('panel=LP.8.1|XEC').analysis.panel).toEqual(['LP.8.1', 'XEC']);
    });

    it('keeps an emptied panel empty', () => {
        const filter = parse('panel=LP.8.1');
        const emptied = { ...filter, analysis: { ...filter.analysis, panel: [] } };

        expect(parse(handler.toSearchParams(emptied).toString()).analysis.panel).toEqual([]);
    });

    it('round-trips the panel', () => {
        expect(handler.toSearchParams(parse('panel=XFG|XEC')).get('panel')).toBe('XFG|XEC');
    });

    it('has no mean proportion in the URL', () => {
        expect(handler.toSearchParams(parse('panel=XFG&meanProportionLower=0.2')).has('meanProportionLower')).toBe(
            false,
        );
    });
});
