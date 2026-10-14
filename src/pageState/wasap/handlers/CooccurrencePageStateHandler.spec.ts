import { describe, expect, it } from 'vitest';

import { CooccurrencePageStateHandler } from './CooccurrencePageStateHandler';
import { testConfigWithCooccurrence } from '../wasapTestConfig';

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
});
