import { describe, expect, it } from 'vitest';

import { VariantExplorerPageStateHandler } from './VariantExplorerPageStateHandler';
import { VARIANT_TIME_FRAME } from '../wasapAnalysisFilter';
import { testConfig } from '../wasapTestConfig';

describe('VariantExplorerPageStateHandler', () => {
    const handler = new VariantExplorerPageStateHandler(testConfig);

    it('parses and encodes variant filter with all parameters', () => {
        const url =
            '/wastewater/covid/variantExplorer?' +
            'locationName=Berlin&' +
            'samplingDate=2024-01-01--2024-12-31&' +
            'granularity=week&' +
            'sequenceType=nucleotide&' +
            'signatureType=computed&' +
            'variant=BA.2*&' +
            'minProportion=0.5&' +
            'minCount=10&' +
            'minJaccard=0.6&' +
            'timeFrame=3months&';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        expect(filter.analysis.mode).toBe('variant');
        const { analysis } = filter;
        expect(analysis.variant).toBe('BA.2*');
        expect(typeof analysis.minProportion).toBe('number');
        expect(analysis.minProportion).toBe(0.5);
        expect(typeof analysis.minCount).toBe('number');
        expect(analysis.minCount).toBe(10);
        expect(typeof analysis.minJaccard).toBe('number');
        expect(analysis.minJaccard).toBe(0.6);
        expect(analysis.timeFrame).toBe(VARIANT_TIME_FRAME.threeMonths);

        const newUrl = handler.toUrl(filter);
        expect(newUrl).toBe(url);
    });

    it('parses and encodes the background lineages, for either signature type', () => {
        const url =
            '/wastewater/covid/variantExplorer?' +
            'locationName=Berlin&' +
            'samplingDate=2024-01-01--2024-12-31&' +
            'granularity=week&' +
            'sequenceType=nucleotide&' +
            'signatureType=predefined&' +
            'lineage=XFG&' +
            'minJaccard=0.8&' +
            'timeFrame=all&' +
            'backgroundLineages=JN.1%7CBA.2&';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        expect(filter.analysis.backgroundLineages).toEqual(['JN.1', 'BA.2']);
        expect(handler.toUrl(filter)).toBe(url);
        expect(
            handler.parsePageStateFromUrl(new URL('http://example.com/wastewater/covid/variantExplorer').searchParams)
                .analysis.backgroundLineages,
        ).toEqual([]);
    });

    it('takes the background lineages from the config, and writes them down only when they differ', () => {
        const withDefault = new VariantExplorerPageStateHandler({
            ...testConfig,
            filterDefaults: {
                ...testConfig.filterDefaults,
                variant: { ...testConfig.filterDefaults.variant, backgroundLineages: ['B.1.1.529'] },
            },
        });
        const parse = (query: string) =>
            withDefault.parsePageStateFromUrl(
                new URL(`http://example.com/wastewater/covid/variantExplorer?${query}`).searchParams,
            );

        expect(parse('').analysis.backgroundLineages).toEqual(['B.1.1.529']);
        expect(withDefault.toUrl(parse(''))).not.toContain('backgroundLineages');
        const cleared = parse('backgroundLineages=');
        expect(cleared.analysis.backgroundLineages).toEqual([]);
        expect(withDefault.toUrl(cleared)).toContain('backgroundLineages=&');
    });

    it('excludes the nearly fixed mutations unless told not to, and only writes that down', () => {
        const parse = (query: string) =>
            handler.parsePageStateFromUrl(
                new URL(`http://example.com/wastewater/covid/variantExplorer?${query}`).searchParams,
            );

        expect(parse('').analysis.excludeNearlyFixed).toBe(true);
        expect(handler.toUrl(parse(''))).not.toContain('excludeNearlyFixed');
        const notExcluding = parse('excludeNearlyFixed=false');
        expect(notExcluding.analysis.excludeNearlyFixed).toBe(false);
        expect(handler.toUrl(notExcluding)).toContain('excludeNearlyFixed=false');
        expect(parse('').analysis.excludeDeletions).toBe(true);
        expect(handler.toUrl(parse('excludeDeletions=false'))).toContain('excludeDeletions=false');
    });

    it('has no mean proportion filter: drops one in the URL', () => {
        const filter = handler.parsePageStateFromUrl(
            new URL(
                'http://example.com/wastewater/covid/variantExplorer?meanProportionLower=0.2&meanProportionUpper=0.7',
            ).searchParams,
        );

        expect(filter.base.meanProportion).toEqual({ lower: 0, upper: 1 });
        expect(handler.toUrl(filter)).not.toContain('meanProportion');
    });

    it('converts numeric string parameters to numbers', () => {
        const url = '/wastewater/covid/variantExplorer?' + 'minProportion=0.5&' + 'minCount=10&' + 'minJaccard=0.6&';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        const { analysis } = filter;
        expect(typeof analysis.minProportion).toBe('number');
        expect(typeof analysis.minCount).toBe('number');
        expect(typeof analysis.minJaccard).toBe('number');
    });

    it('variant mode round-trip preserves numeric precision', () => {
        const url =
            '/wastewater/covid/variantExplorer?' +
            'signatureType=computed&' +
            'minProportion=0.123456&' +
            'minJaccard=0.789012&';
        const filter1 = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);
        const url2 = handler.toUrl(filter1);
        const filter2 = handler.parsePageStateFromUrl(new URL(`http://example.com${url2}`).searchParams);

        const analysis1 = filter1.analysis;
        const analysis2 = filter2.analysis;
        expect(analysis2.minProportion).toBe(analysis1.minProportion);
        expect(analysis2.minJaccard).toBe(analysis1.minJaccard);
    });

    it('defaults signatureType to predefined when absent from URL', () => {
        const url = '/wastewater/covid/variantExplorer?';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        const { analysis } = filter;
        expect(analysis.signatureType).toBe('predefined');
        expect(analysis.lineage).toBe('XFG');
    });

    it('parses and encodes predefined variant filter with lineage (round-trip)', () => {
        const url =
            '/wastewater/covid/variantExplorer?' +
            'locationName=Z%C3%BCrich+%28ZH%29&' +
            'samplingDate=2024-01-01--2024-12-31&' +
            'granularity=day&' +
            'sequenceType=nucleotide&' +
            'signatureType=predefined&' +
            'lineage=XEC&' +
            'minJaccard=0.75&' +
            'timeFrame=all&';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        expect(filter.analysis.mode).toBe('variant');
        const { analysis } = filter;
        expect(analysis.signatureType).toBe('predefined');
        expect(analysis.lineage).toBe('XEC');
        expect(analysis.newMutationsOnly).toBe(false);

        const newUrl = handler.toUrl(filter);
        expect(newUrl).toBe(url);
    });

    it('parses and encodes newMutationsOnly=true in predefined variant mode (round-trip)', () => {
        const url =
            '/wastewater/covid/variantExplorer?' +
            'locationName=Z%C3%BCrich+%28ZH%29&' +
            'samplingDate=2024-01-01--2024-12-31&' +
            'granularity=day&' +
            'sequenceType=nucleotide&' +
            'signatureType=predefined&' +
            'lineage=XEC&' +
            'newMutationsOnly=true&' +
            'minJaccard=0.75&' +
            'timeFrame=all&';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        expect(filter.analysis.mode).toBe('variant');
        const { analysis } = filter;
        expect(analysis.signatureType).toBe('predefined');
        expect(analysis.newMutationsOnly).toBe(true);

        const newUrl = handler.toUrl(filter);
        expect(newUrl).toBe(url);
    });

    it('parses and encodes includeSublineagesForJaccard=false in predefined variant mode (round-trip)', () => {
        const url =
            '/wastewater/covid/variantExplorer?' +
            'locationName=Z%C3%BCrich+%28ZH%29&' +
            'samplingDate=2024-01-01--2024-12-31&' +
            'granularity=day&' +
            'sequenceType=nucleotide&' +
            'signatureType=predefined&' +
            'lineage=XEC&' +
            'includeSublineagesForJaccard=false&' +
            'minJaccard=0.75&' +
            'timeFrame=all&';
        const filter = handler.parsePageStateFromUrl(new URL(`http://example.com${url}`).searchParams);

        expect(filter.analysis.mode).toBe('variant');
        const { analysis } = filter;
        expect(analysis.signatureType).toBe('predefined');
        expect(analysis.includeSublineagesForJaccard).toBe(false);

        const newUrl = handler.toUrl(filter);
        expect(newUrl).toBe(url);
    });
});
