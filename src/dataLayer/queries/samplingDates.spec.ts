import { describe, expect, test } from 'vitest';

import { readValueExtent, samplingDatesQuery } from './samplingDates';
import type { RhydbSchema } from './schema';

const schema: RhydbSchema = {
    table: 'data',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

describe('samplingDatesQuery', () => {
    test('samplingDatesQuery groups by the sampling date, oldest first', () => {
        expect(samplingDatesQuery(schema).render()).toBe(
            'data.group(by := {samplingDate}, aggs := {n := count()}).order(by := {samplingDate.asc()})',
        );
    });
    test('samplingDatesQuery filters and groups on the sampling date', () => {
        expect(samplingDatesQuery(schema, { samplingDateFrom: '2024-01-01' }).render()).toBe(
            "data.filter(samplingDate >= '2024-01-01'::date).group(by := {samplingDate}, aggs := {n := count()}).order(by := {samplingDate.asc()})",
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
