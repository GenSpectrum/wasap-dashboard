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
    table: 'data',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

describe('the Tier-1 read catalogue', () => {
    test('totalReadCountQuery is a bare count', () => {
        expect(totalReadCountQuery(schema).render()).toBe('data.group(by := {}, aggs := {n := count()})');
        expect(totalReadCountQuery(schema, { locationName: 'Basel (BS)' }).render()).toBe(
            "data.filter(locationName = 'Basel (BS)').group(by := {}, aggs := {n := count()})",
        );
    });

    test('stringFieldValuesQuery groups the whole table by the given column', () => {
        expect(stringFieldValuesQuery(schema, 'locationName').render()).toBe(
            'data.group(by := {locationName}, aggs := {n := count()})',
        );
    });

    test('samplingDatesQuery groups by the grouping-date column, oldest first', () => {
        expect(samplingDatesQuery(schema).render()).toBe(
            'data.group(by := {date}, aggs := {n := count()}).order(by := {date.asc()})',
        );
    });

    test('samplingDatesQuery filters and groups on the dictionary date column', () => {
        expect(samplingDatesQuery(schema, { samplingDateFrom: '2024-01-01' }).render()).toBe(
            "data.filter(date >= '2024-01-01').group(by := {date}, aggs := {n := count()}).order(by := {date.asc()})",
        );
    });

    test('sampleOverviewQuery groups the whole table by location, date, sample and batch, unfiltered', () => {
        expect(sampleOverviewQuery(schema).render()).toBe(
            'data.group(by := {locationName, date, sampleId, batchId}, aggs := {n := count()})',
        );
    });

    test('batchCountQuery groups the whole table by batch, unfiltered', () => {
        expect(batchCountQuery(schema).render()).toBe('data.group(by := {batchId}, aggs := {n := count()})');
    });
});
