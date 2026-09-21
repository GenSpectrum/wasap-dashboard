import { describe, expect, it } from 'vitest';

import { ManualPageStateHandler } from './ManualPageStateHandler';
import { testConfig } from '../wasapTestConfig';

describe('ManualPageStateHandler', () => {
    const handler = new ManualPageStateHandler(testConfig);

    const parse = (query: string) => handler.parsePageStateFromUrl(new URLSearchParams(query));

    it('lives at the manual segment below the path of the organism', () => {
        expect(handler.getDefaultPageUrl()).toBe('/wastewater/covid/manual');
    });

    it('parses and encodes manual filter', () => {
        const query =
            'locationName=Z%C3%BCrich+%28ZH%29&' +
            'samplingDate=2024-01-01--2024-12-31&' +
            'granularity=day&' +
            'sequenceType=nucleotide&';

        const filter = parse(query);

        expect(filter.base.locationName).toBe('Zürich (ZH)');
        expect(filter.base.granularity).toBe('day');
        expect(filter.analysis).toEqual({ mode: 'manual', sequenceType: 'nucleotide', mutations: undefined });
        expect(handler.toUrl(filter)).toBe(`/wastewater/covid/manual?${query}`);
    });

    it('does not put the mode into the search params', () => {
        expect(handler.toUrl(parse(''))).not.toContain('analysisMode');
    });

    it('parses multiple mutations', () => {
        const filter = parse('sequenceType=nucleotide&mutations=A23T%7CS:E44H%7CORFla:T123A&');

        expect(filter.analysis.mutations).toEqual(['A23T', 'S:E44H', 'ORFla:T123A']);
    });

    it('round-trips the mutations', () => {
        const filter = parse('sequenceType=amino+acid&mutations=S:E44H%7CS:K417N');

        expect(handler.toUrl(filter)).toContain('mutations=S%3AE44H%7CS%3AK417N');
    });

    it('parses manual mode with no mutations specified', () => {
        const filter = parse('sequenceType=amino+acid&');

        expect(filter.analysis.sequenceType).toBe('amino acid');
        expect(filter.analysis.mutations).toBeUndefined();
    });

    it('takes the sequence type from the defaults of the config when it is not in the URL', () => {
        expect(parse('').analysis.sequenceType).toBe('nucleotide');
    });

    it('defaults the mean proportion depending on whether there are mutations', () => {
        expect(parse('').base.meanProportion).toEqual({ lower: 0.05, upper: 0.95 });
        expect(parse('mutations=A1T').base.meanProportion).toEqual({ lower: 0, upper: 1 });
    });
});
