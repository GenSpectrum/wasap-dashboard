import { describe, expect, it } from 'vitest';

import { UntrackedPageStateHandler } from './UntrackedPageStateHandler';
import { testConfig } from '../wasapTestConfig';

describe('UntrackedPageStateHandler', () => {
    const handler = new UntrackedPageStateHandler(testConfig);

    it('parses and encodes untracked filter with predefined excludeSet', () => {
        const url =
            '/wastewater/covid/untracked?' +
            'locationName=Z%C3%BCrich+%28ZH%29&' +
            'samplingDate=2024-01-01--2024-12-31&' +
            'granularity=day&' +
            'sequenceType=nucleotide&' +
            'excludeSet=predefined&';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        expect(filter.analysis.mode).toBe('untracked');
        const analysis = filter.analysis;
        expect(analysis.excludeSet).toBe('predefined');
        expect(analysis.excludeVariants).toBeUndefined();

        const newUrl = handler.toUrl(filter);
        expect(newUrl).toBe(url);
    });

    it('parses and encodes untracked filter with custom excludeSet and variants', () => {
        const url =
            '/wastewater/covid/untracked?' +
            'locationName=Z%C3%BCrich+%28ZH%29&' +
            'samplingDate=2024-01-01--2024-12-31&' +
            'granularity=day&' +
            'sequenceType=nucleotide&' +
            'excludeSet=custom&' +
            'excludeVariants=XBB.1.5*%7CBA.2*%7CJN.1&';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        expect(filter.analysis.mode).toBe('untracked');
        const analysis = filter.analysis;
        expect(analysis.excludeSet).toBe('custom');
        expect(analysis.excludeVariants).toEqual(['XBB.1.5*', 'BA.2*', 'JN.1']);

        const newUrl = handler.toUrl(filter);
        expect(newUrl).toBe(url);
    });

    it('untracked mode round-trip with pipe-separated variants', () => {
        const url =
            '/wastewater/covid/untracked?' +
            'sequenceType=nucleotide&' +
            'excludeSet=custom&' +
            'excludeVariants=XBB*%7CBA.2*%7CJN.1%7CXFG*&';
        const filter1 = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);
        const url2 = handler.toUrl(filter1);
        const filter2 = handler.parsePageStateFromUrl(new URL(`http://example.com${url2}`).searchParams);

        const analysis1 = filter1.analysis;
        const analysis2 = filter2.analysis;
        expect(analysis2.excludeVariants).toEqual(analysis1.excludeVariants);
    });
});
