import { describe, expect, test } from 'vitest';

import { locationNamesQuery, samplingDatesQuery, totalReadCountQuery } from './catalogue';
import type { SiloSchema } from './schema';

const schema: SiloSchema = { table: 'default', locationName: 'locationName', samplingDate: 'samplingDate' };

describe('the Tier-1 read catalogue', () => {
    test('totalReadCountQuery is a bare count, or a filtered one', () => {
        expect(totalReadCountQuery(schema).render()).toBe('default.groupBy({n := count()})');
        expect(totalReadCountQuery(schema, { locationName: 'Basel (BS)' }).render()).toBe(
            "default.filter(locationName = 'Basel (BS)').groupBy({n := count()})",
        );
    });

    test('locationNamesQuery groups the whole table by the location column', () => {
        expect(locationNamesQuery(schema).render()).toBe('default.groupBy({n := count()}, {locationName})');
    });

    test('samplingDatesQuery groups by the date column, oldest first', () => {
        expect(samplingDatesQuery(schema).render()).toBe(
            'default.groupBy({n := count()}, {samplingDate}).orderBy({samplingDate.asc()})',
        );
    });

    test('samplingDatesQuery carries the filter through', () => {
        expect(samplingDatesQuery(schema, { samplingDateFrom: '2024-01-01' }).render()).toBe(
            "default.filter(samplingDate >= '2024-01-01'::date).groupBy({n := count()}, {samplingDate}).orderBy({samplingDate.asc()})",
        );
    });
});
