import { describe, expect, test } from 'vitest';

import { readValueExtent, samplingDatesQuery } from './samplingDates';
import type { RhydbSchema } from './schema';

const schema: RhydbSchema = {
    table: 'data',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

describe('samplingDatesQuery', () => {
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
});

describe('readValueExtent', () => {
    test('is the first and last value of a sorted result', () => {
        expect(
            readValueExtent(
                [
                    { samplingDate: '2023-05-01', n: 1 },
                    { samplingDate: '2024-01-10', n: 2 },
                    { samplingDate: '2025-12-27', n: 3 },
                ],
                'samplingDate',
            ),
        ).toEqual({ min: '2023-05-01', max: '2025-12-27' });
    });

    test('no rows means no extent', () => {
        expect(readValueExtent([], 'samplingDate')).toBeUndefined();
    });
});
