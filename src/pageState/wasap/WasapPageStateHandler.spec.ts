import { describe, expect, it } from 'vitest';

import { WasapPageStateHandler } from './WasapPageStateHandler';
import { type WasapResistanceFilter } from './wasapAnalysisFilter';
import { testConfig } from './wasapTestConfig';
import { type WasapPageConfig } from '../../config/wasapPageConfig';

const config: WasapPageConfig = testConfig;

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

    describe('analysis mode', () => {
        it('uses the handler of the mode in the URL and writes the mode back', () => {
            const filter = handler.parsePageStateFromUrl(
                new URL('http://example.com/wastewater/covid?analysisMode=untracked&excludeSet=custom').searchParams,
            );

            expect(filter.analysis.mode).toBe('untracked');
            expect(handler.toUrl(filter)).toContain('analysisMode=untracked&');
        });

        it('throws when the mode in the URL is not enabled', () => {
            const url = '/wastewater/covid?analysisMode=covSpectrumCollection&collectionId=123&';

            expect(() => handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams)).toThrow(
                "The 'covSpectrumCollection' analysis mode is not enabled.",
            );
        });
    });
});
