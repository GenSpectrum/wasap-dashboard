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
});
