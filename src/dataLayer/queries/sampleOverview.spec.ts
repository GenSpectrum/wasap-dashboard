import { describe, expect, test } from 'vitest';

import { readSampleOverview, sampleOverviewQuery } from './sampleOverview';
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

describe('sampleOverviewQuery', () => {
    test('sampleOverviewQuery groups the whole table by location, date, sample and batch, unfiltered', () => {
        expect(sampleOverviewQuery(schema).render()).toBe(
            'data.group(by := {locationName, date, sampleId, batchId}, aggs := {n := count()})',
        );
    });
});

describe('readSampleOverview', () => {
    test('reads one entry per row', () => {
        expect(
            readSampleOverview(
                [{ locationName: 'Basel (BS)', date: '2024-01-10', sampleId: 'A1', batchId: 'B1', n: 10 }],
                schema,
            ),
        ).toEqual([{ locationName: 'Basel (BS)', date: '2024-01-10', sampleId: 'A1', batchId: 'B1', reads: 10 }]);
    });

    test('drops a row with a blank location', () => {
        expect(
            readSampleOverview([{ locationName: '', date: '2024-01-10', sampleId: 'X1', batchId: 'B1', n: 1 }], schema),
        ).toEqual([]);
    });

    test('no rows means no samples', () => {
        expect(readSampleOverview([], schema)).toEqual([]);
    });
});
