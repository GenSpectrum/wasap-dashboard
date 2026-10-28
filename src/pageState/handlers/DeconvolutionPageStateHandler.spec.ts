import { describe, expect, it } from 'vitest';

import { DeconvolutionPageStateHandler } from './DeconvolutionPageStateHandler';
import { testConfigWithDeconvolution } from '../../test/testConfig';

describe('DeconvolutionPageStateHandler', () => {
    const handler = new DeconvolutionPageStateHandler(testConfigWithDeconvolution);

    const parse = (query: string) => handler.parsePageStateFromUrl(new URLSearchParams(query));

    it('lives at the lineagePrevalence segment below the path of the organism', () => {
        expect(handler.getDefaultPageUrl()).toBe('/wastewater/covid/lineagePrevalence');
    });

    it('has no extra lineage when the URL has none', () => {
        expect(parse('').analysis).toEqual({ mode: 'deconvolution' });
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
