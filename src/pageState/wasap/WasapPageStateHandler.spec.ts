import { describe, expect, it } from 'vitest';

import { WasapPageStateHandler } from './WasapPageStateHandler';
import {
    type WasapCovSpectrumCollectionFilter,
    type WasapResistanceFilter,
    type WasapUntrackedFilter,
} from './wasapAnalysisFilter';
import { testConfig, testConfigWithCollection } from './wasapTestConfig';
import { type WasapPageConfig } from '../../config/wasapPageConfig';

const config: WasapPageConfig = testConfig;
const configWithCollection: WasapPageConfig = testConfigWithCollection;

describe('WasapPageStateHandler', () => {
    const handler = new WasapPageStateHandler(config);

    describe('default URL', () => {
        it('should return the default page URL', () => {
            const url = handler.getDefaultPageUrl();
            expect(url).toBe('/wastewater/covid');
        });

        it('uses configured default mode when URL has no analysisMode', () => {
            const handlerWithDefaultMode = new WasapPageStateHandler({
                ...config,
                defaultAnalysisMode: 'resistance',
            });

            // A bare URL should use the configured mode instead of the first enabled mode.
            const filter = handlerWithDefaultMode.parsePageStateFromUrl(
                new URL('http://example.com/wastewater/covid').searchParams,
            );

            expect(filter.analysis.mode).toBe('resistance');
            expect((filter.analysis as WasapResistanceFilter).resistanceSet).toBe('3CLpro');
        });
    });

    describe('mean proportion', () => {
        const parse = (query: string) =>
            handler.parsePageStateFromUrl(new URL(`http://example.com/wastewater/covid?${query}`).searchParams);

        it('defaults to the default of the analysis mode when missing from URL', () => {
            expect(parse('analysisMode=manual').base.meanProportion).toEqual({ lower: 0.05, upper: 0.95 });
            expect(parse('analysisMode=manual&mutations=A1T').base.meanProportion).toEqual({ lower: 0, upper: 1 });
            expect(parse('analysisMode=resistance').base.meanProportion).toEqual({ lower: 0.05, upper: 1 });
        });

        it('omits a value from the URL when it is the default of the mode', () => {
            const url = handler.toUrl(
                parse('analysisMode=resistance&meanProportionLower=0.05&meanProportionUpper=0.5'),
            );

            expect(url).not.toContain('meanProportionLower');
            expect(url).toContain('meanProportionUpper=0.5');
        });
    });

    describe('resistance mode', () => {
        it('parses and encodes resistance filter', () => {
            const url =
                '/wastewater/covid?' +
                'locationName=Z%C3%BCrich+%28ZH%29&' +
                'samplingDate=2024-01-01--2024-12-31&' +
                'granularity=day&' +
                'analysisMode=resistance&' +
                'resistanceSet=3CLpro&';
            const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

            expect(filter.analysis.mode).toBe('resistance');
            const analysis = filter.analysis as WasapResistanceFilter;
            expect(analysis.resistanceSet).toBe('3CLpro');

            const newUrl = handler.toUrl(filter);
            expect(newUrl).toBe(url);
        });

        it('resistance mode always uses amino acid sequence type', () => {
            const url = '/wastewater/covid?analysisMode=resistance&resistanceSet=3CLpro&sequenceType=nucleotide&';
            const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

            expect(filter.analysis.mode).toBe('resistance');
            const analysis = filter.analysis as WasapResistanceFilter;
            expect(analysis.sequenceType).toBe('amino acid');
        });
    });

    describe('untracked mode', () => {
        it('parses and encodes untracked filter with predefined excludeSet', () => {
            const url =
                '/wastewater/covid?' +
                'locationName=Z%C3%BCrich+%28ZH%29&' +
                'samplingDate=2024-01-01--2024-12-31&' +
                'granularity=day&' +
                'analysisMode=untracked&' +
                'sequenceType=nucleotide&' +
                'excludeSet=predefined&';
            const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

            expect(filter.analysis.mode).toBe('untracked');
            const analysis = filter.analysis as WasapUntrackedFilter;
            expect(analysis.excludeSet).toBe('predefined');
            expect(analysis.excludeVariants).toBeUndefined();

            const newUrl = handler.toUrl(filter);
            expect(newUrl).toBe(url);
        });

        it('parses and encodes untracked filter with custom excludeSet and variants', () => {
            const url =
                '/wastewater/covid?' +
                'locationName=Z%C3%BCrich+%28ZH%29&' +
                'samplingDate=2024-01-01--2024-12-31&' +
                'granularity=day&' +
                'analysisMode=untracked&' +
                'sequenceType=nucleotide&' +
                'excludeSet=custom&' +
                'excludeVariants=XBB.1.5*%7CBA.2*%7CJN.1&';
            const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

            expect(filter.analysis.mode).toBe('untracked');
            const analysis = filter.analysis as WasapUntrackedFilter;
            expect(analysis.excludeSet).toBe('custom');
            expect(analysis.excludeVariants).toEqual(['XBB.1.5*', 'BA.2*', 'JN.1']);

            const newUrl = handler.toUrl(filter);
            expect(newUrl).toBe(url);
        });

        it('untracked mode round-trip with pipe-separated variants', () => {
            const url =
                '/wastewater/covid?' +
                'analysisMode=untracked&' +
                'sequenceType=nucleotide&' +
                'excludeSet=custom&' +
                'excludeVariants=XBB*%7CBA.2*%7CJN.1%7CXFG*&';
            const filter1 = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);
            const url2 = handler.toUrl(filter1);
            const filter2 = handler.parsePageStateFromUrl(new URL(`http://example.com${url2}`).searchParams);

            const analysis1 = filter1.analysis as WasapUntrackedFilter;
            const analysis2 = filter2.analysis as WasapUntrackedFilter;
            expect(analysis2.excludeVariants).toEqual(analysis1.excludeVariants);
        });
    });

    describe('collection mode', () => {
        const handlerWithCollection = new WasapPageStateHandler(configWithCollection);

        it('throws error when feature is disabled', () => {
            const url = '/wastewater/covid?analysisMode=covSpectrumCollection&collectionId=123&';
            expect(() => handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams)).toThrow(
                "The 'covSpectrumCollection' analysis mode is not enabled.",
            );
        });

        it('parses and encodes collection filter with collectionId', () => {
            const url =
                '/wastewater/covid?' +
                'locationName=Z%C3%BCrich+%28ZH%29&' +
                'samplingDate=2024-01-01--2024-12-31&' +
                'granularity=day&' +
                'analysisMode=covSpectrumCollection&' +
                'collectionId=123&';
            const filter = handlerWithCollection.parsePageStateFromUrl(
                new URL(`http://example.com${url}`).searchParams,
            );

            expect(filter.analysis.mode).toBe('covSpectrumCollection');
            const analysis = filter.analysis as WasapCovSpectrumCollectionFilter;
            expect(analysis.collectionId).toBe(123);

            const newUrl = handlerWithCollection.toUrl(filter);
            expect(newUrl).toBe(url);
        });

        it('parses collection filter without collectionId', () => {
            const url = '/wastewater/covid?analysisMode=covSpectrumCollection&';
            const filter = handlerWithCollection.parsePageStateFromUrl(
                new URL(`http://example.com${url}`).searchParams,
            );

            expect(filter.analysis.mode).toBe('covSpectrumCollection');
            const analysis = filter.analysis as WasapCovSpectrumCollectionFilter;
            expect(analysis.collectionId).toBeUndefined();
        });

        it('encodes collection filter omits undefined collectionId', () => {
            const url = '/wastewater/covid?analysisMode=covSpectrumCollection&';
            const filter = handlerWithCollection.parsePageStateFromUrl(
                new URL(`http://example.com${url}`).searchParams,
            );

            const encodedUrl = handlerWithCollection.toUrl(filter);
            expect(encodedUrl).not.toContain('collectionId');
        });

        it('converts collectionId string to number', () => {
            const url = '/wastewater/covid?analysisMode=covSpectrumCollection&collectionId=456&';
            const filter = handlerWithCollection.parsePageStateFromUrl(
                new URL(`http://example.com${url}`).searchParams,
            );

            const analysis = filter.analysis as WasapCovSpectrumCollectionFilter;
            expect(typeof analysis.collectionId).toBe('number');
            expect(analysis.collectionId).toBe(456);
        });

        it('collection mode round-trip preserves collectionId', () => {
            const url = '/wastewater/covid?analysisMode=covSpectrumCollection&collectionId=789&';
            const filter1 = handlerWithCollection.parsePageStateFromUrl(
                new URL(`http://example.com${url}`).searchParams,
            );
            const url2 = handlerWithCollection.toUrl(filter1);
            const filter2 = handlerWithCollection.parsePageStateFromUrl(
                new URL(`http://example.com${url2}`).searchParams,
            );

            const analysis1 = filter1.analysis as WasapCovSpectrumCollectionFilter;
            const analysis2 = filter2.analysis as WasapCovSpectrumCollectionFilter;
            expect(analysis2.collectionId).toBe(analysis1.collectionId);
        });
    });
});
