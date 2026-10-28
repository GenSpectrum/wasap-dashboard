import { describe, expect, it } from 'vitest';

import { CooccurrencePageStateHandler } from './CooccurrencePageStateHandler';
import { testConfigWithCooccurrence } from '../../test/testConfig';

describe('CooccurrencePageStateHandler', () => {
    const handler = new CooccurrencePageStateHandler(testConfigWithCooccurrence);

    const parse = (query: string) => handler.parsePageStateFromUrl(new URLSearchParams(query));

    it('lives at the cooccurrence segment below the path of the organism', () => {
        expect(handler.getDefaultPageUrl()).toBe('/wastewater/covid/cooccurrence');
    });

    it('parses and encodes the cooccurrence filter', () => {
        const query =
            'locationName=Z%C3%BCrich+%28ZH%29&' +
            'samplingDate=2024-01-01--2024-12-31&' +
            'granularity=day&' +
            'sequenceType=nucleotide&';

        const filter = parse(query);

        expect(filter.base.locationNames).toEqual(['Zürich (ZH)']);
        expect(filter.analysis).toEqual({ mode: 'cooccurrence', sequenceType: 'nucleotide', positions: undefined });
        expect(handler.parsePageStateFromUrl(handler.toSearchParams(filter))).toEqual(filter);
    });

    it('parses multiple positions', () => {
        const filter = parse('sequenceType=nucleotide&positions=241%7C23403');
        expect(filter.analysis.positions).toEqual(['241', '23403']);
    });

    it('round-trips positions', () => {
        const filter = parse('sequenceType=amino+acid&positions=S%3A501%7CS%3A614');
        expect(handler.toUrl(filter)).toContain('positions=S%3A501%7CS%3A614');
    });

    it('takes the sequence type from the defaults of the config when it is not in the URL', () => {
        expect(parse('').analysis.sequenceType).toBe('nucleotide');
    });

    it('parses the amplicon-anchor fields', () => {
        const filter = parse('sequenceType=nucleotide&positionSource=amplicon&anchorPosition=23403&entropyCutoff=0.5');
        expect(filter.analysis.positionSource).toBe('amplicon');
        expect(filter.analysis.anchorPosition).toBe('23403');
        expect(filter.analysis.entropyCutoff).toBe(0.5);
    });

    it('round-trips the amplicon-anchor fields', () => {
        const filter = parse('sequenceType=nucleotide&positionSource=amplicon&anchorPosition=23403&entropyCutoff=0.5');
        const url = handler.toUrl(filter);
        expect(url).toContain('positionSource=amplicon');
        expect(url).toContain('anchorPosition=23403');
        expect(url).toContain('entropyCutoff=0.5');
    });

    it('round-trips the min. share, and has no mean proportion in the URL', () => {
        const filter = parse('sequenceType=nucleotide&minShare=0.01&meanProportionLower=0.1');
        expect(filter.analysis.minShare).toBe(0.01);
        const url = handler.toUrl(filter);
        expect(url).toContain('minShare=0.01');
        expect(url).not.toContain('meanProportion');
    });

    describe('with a default panel in the config', () => {
        const withPanel = new CooccurrencePageStateHandler({
            ...testConfigWithCooccurrence,
            filterDefaults: {
                ...testConfigWithCooccurrence.filterDefaults,
                cooccurrence: { ...testConfigWithCooccurrence.filterDefaults.cooccurrence, panel: ['XFG', 'XEC'] },
            },
        });
        const parseWithPanel = (query: string) => withPanel.parsePageStateFromUrl(new URLSearchParams(query));

        it('takes the panel from the config when it is not in the URL', () => {
            expect(parseWithPanel('').analysis.panel).toEqual(['XFG', 'XEC']);
        });

        it('takes the panel from the URL over the default one', () => {
            expect(parseWithPanel('panel=XFG%7CNB.1.8.1').analysis.panel).toEqual(['XFG', 'NB.1.8.1']);
        });

        it('keeps an emptied panel empty, rather than falling back to the default one', () => {
            const filter = parseWithPanel('panel=');
            expect(filter.analysis.panel).toBeUndefined();
            expect(withPanel.parsePageStateFromUrl(withPanel.toSearchParams(filter)).analysis.panel).toBeUndefined();
        });
    });
});
