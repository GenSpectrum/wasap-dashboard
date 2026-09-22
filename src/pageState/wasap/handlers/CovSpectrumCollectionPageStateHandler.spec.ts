import { describe, expect, it } from 'vitest';

import { CovSpectrumCollectionPageStateHandler } from './CovSpectrumCollectionPageStateHandler';
import { testConfigWithCollection } from '../wasapTestConfig';

describe('CovSpectrumCollectionPageStateHandler', () => {
    const handler = new CovSpectrumCollectionPageStateHandler(testConfigWithCollection);

    it('parses and encodes collection filter with collectionId', () => {
        const url =
            '/wastewater/covid/covSpectrumCollection?' +
            'locationName=Z%C3%BCrich+%28ZH%29&' +
            'samplingDate=2024-01-01--2024-12-31&' +
            'granularity=day&' +
            'collectionId=123&';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        expect(filter.analysis.mode).toBe('covSpectrumCollection');
        const analysis = filter.analysis;
        expect(analysis.collectionId).toBe(123);

        const newUrl = handler.toUrl(filter);
        expect(newUrl).toBe(url);
    });

    it('parses collection filter without collectionId', () => {
        const url = '/wastewater/covid/covSpectrumCollection?';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        expect(filter.analysis.mode).toBe('covSpectrumCollection');
        const analysis = filter.analysis;
        expect(analysis.collectionId).toBeUndefined();
    });

    it('encodes collection filter omits undefined collectionId', () => {
        const url = '/wastewater/covid/covSpectrumCollection?';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        const encodedUrl = handler.toUrl(filter);
        expect(encodedUrl).not.toContain('collectionId');
    });

    it('converts collectionId string to number', () => {
        const url = '/wastewater/covid/covSpectrumCollection?collectionId=456&';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        const analysis = filter.analysis;
        expect(typeof analysis.collectionId).toBe('number');
        expect(analysis.collectionId).toBe(456);
    });

    it('collection mode round-trip preserves collectionId', () => {
        const url = '/wastewater/covid/covSpectrumCollection?collectionId=789&';
        const filter1 = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);
        const url2 = handler.toUrl(filter1);
        const filter2 = handler.parsePageStateFromUrl(new URL(`http://example.com${url2}`).searchParams);

        const analysis1 = filter1.analysis;
        const analysis2 = filter2.analysis;
        expect(analysis2.collectionId).toBe(analysis1.collectionId);
    });
});
