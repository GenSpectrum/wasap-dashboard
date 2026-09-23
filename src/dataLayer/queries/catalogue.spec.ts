import { describe, expect, test } from 'vitest';

import {
    batchCountQuery,
    sampleOverviewQuery,
    samplingDatesQuery,
    stringFieldValuesQuery,
    totalReadCountQuery,
} from './catalogue';
import type { SiloSchema } from './schema';

const schema: SiloSchema = {
    table: 'default',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

describe('the Tier-1 read catalogue', () => {
    test('totalReadCountQuery groups by location, not a bare count, to dodge a SILO perf bug', () => {
        expect(totalReadCountQuery(schema).render()).toBe('default.groupBy({n := count()}, {locationName})');
        expect(totalReadCountQuery(schema, { locationName: 'Basel (BS)' }).render()).toBe(
            "default.filter(locationName = 'Basel (BS)').groupBy({n := count()}, {locationName})",
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

    test('samplingDatesQuery filters and groups on the dictionary date column', () => {
        expect(samplingDatesQuery(schema, { samplingDateFrom: '2024-01-01' }).render()).toBe(
            "default.filter(date >= '2024-01-01').groupBy({n := count()}, {date}).orderBy({date.asc()})",
        );
    });

    test('sampleOverviewQuery groups the whole table by location, date, sample and batch, unfiltered', () => {
        expect(sampleOverviewQuery(schema).render()).toBe(
            'default.groupBy({n := count()}, {locationName, date, sampleId, batchId})',
        );
    });

    test('batchCountQuery groups the whole table by batch, unfiltered', () => {
        expect(batchCountQuery(schema).render()).toBe('default.groupBy({n := count()}, {batchId})');
    });
});
