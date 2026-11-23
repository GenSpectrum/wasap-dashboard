import { describe, expect, test } from 'vitest';

import { filterExpression, normalizeFilter, scoped, type RhydbReadFilter } from './filter';
import type { RhydbSchema } from './schema';

const schema: RhydbSchema = {
    table: 'data',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

const render = (filter: RhydbReadFilter) => filterExpression(schema, filter)?.render();

describe('filterExpression', () => {
    test('nothing to narrow by is undefined rather than an empty string', () => {
        expect(render({})).toBeUndefined();
    });

    test('a location match is an equality on the configured column, string-escaped', () => {
        expect(render({ locationNames: ['Genève (GE)'] })).toBe("locationName = 'Genève (GE)'");
        expect(render({ locationNames: ["O'Brien"] })).toBe("locationName = 'O''Brien'");
    });

    test('several locations are a set membership', () => {
        expect(render({ locationNames: ['Basel (BS)', 'Genève (GE)'] })).toBe(
            "locationName.in({'Basel (BS)', 'Genève (GE)'})",
        );
    });

    test('a date bound compares against the DATE32 sampling date with a ::date cast', () => {
        expect(render({ samplingDateFrom: '2024-01-01' })).toBe("samplingDate >= '2024-01-01'::date");
        expect(render({ samplingDateTo: '2024-12-31' })).toBe("samplingDate <= '2024-12-31'::date");
    });

    test('a full window is the two bounds and the location, in a fixed order', () => {
        expect(
            render({ samplingDateTo: '2024-12-31', locationNames: ['Zürich (ZH)'], samplingDateFrom: '2024-01-01' }),
        ).toBe(
            "locationName = 'Zürich (ZH)' && samplingDate >= '2024-01-01'::date && samplingDate <= '2024-12-31'::date",
        );
    });

    test('a malformed date is rejected where it is built, not sent', () => {
        expect(() => render({ samplingDateFrom: '01/01/2024' })).toThrow();
        expect(() => render({ samplingDateFrom: "2024-01-01'; drop" })).toThrow();
    });
});

describe('normalizeFilter', () => {
    test('drops undefined fields and fixes key order', () => {
        expect(Object.keys(normalizeFilter({ samplingDateTo: '2024-12-31', locationNames: ['x'] }))).toEqual([
            'locationNames',
            'samplingDateTo',
        ]);
        expect(normalizeFilter({ locationNames: undefined })).toEqual({});
    });

    test('sorts the locations and drops duplicates', () => {
        expect(normalizeFilter({ locationNames: ['Zürich (ZH)', 'Basel (BS)', 'Zürich (ZH)'] })).toEqual({
            locationNames: ['Basel (BS)', 'Zürich (ZH)'],
        });
    });
});

describe('scoped', () => {
    test('an unnarrowed table stays bare', () => {
        expect(scoped(schema, {}).render()).toBe('data');
    });

    test('a narrowed table is filtered', () => {
        expect(scoped(schema, { locationNames: ['Basel (BS)'] }).render()).toBe(
            "data.filter(locationName = 'Basel (BS)')",
        );
    });
});
