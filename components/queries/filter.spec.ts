import { describe, expect, test } from 'vitest';

import { filterExpression, normalizeFilter, scoped, type SiloReadFilter } from './filter';
import type { SiloSchema } from './schema';

const schema: SiloSchema = {
    table: 'default',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
};

const render = (filter: SiloReadFilter) => filterExpression(schema, filter)?.render();

describe('filterExpression', () => {
    test('nothing to narrow by is undefined rather than an empty string', () => {
        expect(render({})).toBeUndefined();
    });

    test('a location match is an equality on the configured column, string-escaped', () => {
        expect(render({ locationName: 'Genève (GE)' })).toBe("locationName = 'Genève (GE)'");
        expect(render({ locationName: "O'Brien" })).toBe("locationName = 'O''Brien'");
    });

    test('a date bound compares against the DATE32 column with a ::date cast', () => {
        expect(render({ samplingDateFrom: '2024-01-01' })).toBe("samplingDate >= '2024-01-01'::date");
        expect(render({ samplingDateTo: '2024-12-31' })).toBe("samplingDate <= '2024-12-31'::date");
    });

    test('a full window is the two bounds and the location, in a fixed order', () => {
        expect(
            render({ samplingDateTo: '2024-12-31', locationName: 'Zürich (ZH)', samplingDateFrom: '2024-01-01' }),
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
        expect(Object.keys(normalizeFilter({ samplingDateTo: '2024-12-31', locationName: 'x' }))).toEqual([
            'locationName',
            'samplingDateTo',
        ]);
        expect(normalizeFilter({ locationName: undefined })).toEqual({});
    });
});

describe('scoped', () => {
    test('an unnarrowed table stays bare', () => {
        expect(scoped(schema, {}).render()).toBe('default');
    });

    test('a narrowed table is filtered', () => {
        expect(scoped(schema, { locationName: 'Basel (BS)' }).render()).toBe(
            "default.filter(locationName = 'Basel (BS)')",
        );
    });
});
