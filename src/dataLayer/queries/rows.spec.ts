import { describe, expect, test } from 'vitest';

import { readLocationOverview, readNamedCounts, readSampleOverview, readTotalCount, readValueExtent } from './rows';
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

describe('readTotalCount', () => {
    test('reads n off the single row', () => {
        expect(readTotalCount([{ n: 596520334 }])).toBe(596520334);
    });

    test('anything but one row throws', () => {
        expect(() => readTotalCount([])).toThrow('one');
        expect(() => readTotalCount([{ n: 1 }, { n: 2 }])).toThrow('one');
    });

    test('a non-count value throws and names the column', () => {
        expect(() => readTotalCount([{ n: -1 }])).toThrow('n');
    });
});

describe('readNamedCounts', () => {
    test('maps the named column and n, dropping a blank name', () => {
        expect(
            readNamedCounts(
                [
                    { locationName: 'Basel (BS)', n: 10 },
                    { locationName: '', n: 3 },
                    { locationName: 'Zürich (ZH)', n: 20 },
                ],
                'locationName',
            ),
        ).toEqual([
            { name: 'Basel (BS)', count: 10 },
            { name: 'Zürich (ZH)', count: 20 },
        ]);
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

describe('readLocationOverview', () => {
    test('counts the samples of a location and their reads, and keeps the most recent of their dates', () => {
        expect(
            readLocationOverview([
                { locationName: 'Basel (BS)', date: '2024-01-10', sampleId: 'A1', batchId: 'B1', reads: 10 },
                { locationName: 'Basel (BS)', date: '2024-02-05', sampleId: 'A2', batchId: 'B1', reads: 8 },
                { locationName: 'Basel (BS)', date: '2024-01-20', sampleId: 'A3', batchId: 'B1', reads: 9 },
            ]),
        ).toEqual([{ name: 'Basel (BS)', sampleCount: 3, totalReads: 27, mostRecentSampleDate: '2024-02-05' }]);
    });

    test('keeps one entry per location, sorted by name', () => {
        expect(
            readLocationOverview([
                { locationName: 'Zürich (ZH)', date: '2024-01-10', sampleId: 'Z1', batchId: 'B1', reads: 5 },
                { locationName: 'Basel (BS)', date: '2024-01-12', sampleId: 'B1', batchId: 'B1', reads: 5 },
            ]),
        ).toEqual([
            { name: 'Basel (BS)', sampleCount: 1, totalReads: 5, mostRecentSampleDate: '2024-01-12' },
            { name: 'Zürich (ZH)', sampleCount: 1, totalReads: 5, mostRecentSampleDate: '2024-01-10' },
        ]);
    });

    test('no samples means no locations', () => {
        expect(readLocationOverview([])).toEqual([]);
    });
});
