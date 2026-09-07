import { describe, expect, test } from 'vitest';

import { samplingDatesQuery, stringFieldValuesQuery, totalReadCountQuery } from './catalogue';
import type { SiloSchema } from './schema';

const schema: SiloSchema = {
    table: 'default',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    nucleotideSequence: 'main',
};

describe('the Tier-1 read catalogue', () => {
    test('totalReadCountQuery is a bare count, or a filtered one', () => {
        expect(totalReadCountQuery(schema).render()).toBe('default.groupBy({n := count()})');
        expect(totalReadCountQuery(schema, { locationName: 'Basel (BS)' }).render()).toBe(
            "default.filter(locationName = 'Basel (BS)').groupBy({n := count()})",
        );
    });

    test('stringFieldValuesQuery groups the whole table by the given column', () => {
        expect(stringFieldValuesQuery(schema, 'locationName').render()).toBe(
            'default.groupBy({n := count()}, {locationName})',
        );
    });

    test('samplingDatesQuery groups by the grouping-date column, oldest first', () => {
        expect(samplingDatesQuery(schema).render()).toBe(
            'default.groupBy({n := count()}, {date}).orderBy({date.asc()})',
        );
    });

    test('samplingDatesQuery filters on the DATE32 column but groups on the grouping-date column', () => {
        expect(samplingDatesQuery(schema, { samplingDateFrom: '2024-01-01' }).render()).toBe(
            "default.filter(samplingDate >= '2024-01-01'::date).groupBy({n := count()}, {date}).orderBy({date.asc()})",
        );
    });
});
