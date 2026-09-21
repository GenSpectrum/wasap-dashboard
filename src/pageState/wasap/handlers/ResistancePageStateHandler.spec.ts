import { describe, expect, it } from 'vitest';

import { ResistancePageStateHandler } from './ResistancePageStateHandler';
import { testConfig } from '../wasapTestConfig';

describe('ResistancePageStateHandler', () => {
    const handler = new ResistancePageStateHandler(testConfig);

    it('parses and encodes resistance filter', () => {
        const url =
            '/wastewater/covid/resistance?' +
            'locationName=Z%C3%BCrich+%28ZH%29&' +
            'samplingDate=2024-01-01--2024-12-31&' +
            'granularity=day&' +
            'resistanceSet=3CLpro&';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        expect(filter.analysis.mode).toBe('resistance');
        const analysis = filter.analysis;
        expect(analysis.resistanceSet).toBe('3CLpro');

        const newUrl = handler.toUrl(filter);
        expect(newUrl).toBe(url);
    });

    it('resistance mode always uses amino acid sequence type', () => {
        const url = '/wastewater/covid/resistance?resistanceSet=3CLpro&sequenceType=nucleotide&';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        expect(filter.analysis.mode).toBe('resistance');
        const analysis = filter.analysis;
        expect(analysis.sequenceType).toBe('amino acid');
    });

    it('lives at the resistance segment below the path of the organism', () => {
        expect(handler.getDefaultPageUrl()).toBe('/wastewater/covid/resistance');
    });

    it('takes the resistance set from the defaults of the config when it is not in the URL', () => {
        const filter = handler.parsePageStateFromUrl(new URLSearchParams(''));

        expect(filter.analysis.resistanceSet).toBe('3CLpro');
    });

    it('defaults the mean proportion to 5% to 100%', () => {
        const filter = handler.parsePageStateFromUrl(new URLSearchParams(''));

        expect(filter.base.meanProportion).toEqual({ lower: 0.05, upper: 1 });
    });

    it('omits a mean proportion from the URL when it is the default of the mode', () => {
        const filter = handler.parsePageStateFromUrl(
            new URLSearchParams('meanProportionLower=0.05&meanProportionUpper=0.5'),
        );

        const url = handler.toUrl(filter);

        expect(url).not.toContain('meanProportionLower');
        expect(url).toContain('meanProportionUpper=0.5');
    });
});
