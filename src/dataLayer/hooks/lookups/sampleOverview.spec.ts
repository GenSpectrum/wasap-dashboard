import { describe, expect, test } from 'vitest';

import { readLocationOverview } from './sampleOverview';

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
