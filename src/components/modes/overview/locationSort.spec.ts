import { describe, expect, test } from 'vitest';

import { DEFAULT_LOCATION_SORT, nextLocationSort, sortLocations } from './locationSort';

describe('nextLocationSort', () => {
    test('sorts by a new column, locations alphabetically', () => {
        expect(nextLocationSort({ column: 'sampleCount', direction: 'descending' }, 'name')).toEqual({
            column: 'name',
            direction: 'ascending',
        });
    });

    test('sorts by a new column, values highest and dates most recent first', () => {
        expect(nextLocationSort(DEFAULT_LOCATION_SORT, 'mostRecentSampleDate')).toEqual({
            column: 'mostRecentSampleDate',
            direction: 'descending',
        });
        expect(nextLocationSort(DEFAULT_LOCATION_SORT, 'totalReads')).toEqual({
            column: 'totalReads',
            direction: 'descending',
        });
    });

    test('reverses the direction when sorting by the same column again', () => {
        expect(nextLocationSort(DEFAULT_LOCATION_SORT, 'name')).toEqual({ column: 'name', direction: 'descending' });
        expect(nextLocationSort({ column: 'sampleCount', direction: 'descending' }, 'sampleCount')).toEqual({
            column: 'sampleCount',
            direction: 'ascending',
        });
    });
});

describe('sortLocations', () => {
    const basel = { name: 'Basel (BS)', sampleCount: 3, totalReads: 900, mostRecentSampleDate: '2024-02-05' };
    const geneva = { name: 'Geneva (GE)', sampleCount: 5, totalReads: 100, mostRecentSampleDate: '2024-01-10' };
    const zurich = { name: 'Zürich (ZH)', sampleCount: 3, totalReads: 500, mostRecentSampleDate: '2024-03-01' };
    const locations = [geneva, zurich, basel];

    test('sorts alphabetically by location, either way', () => {
        expect(sortLocations(locations, { column: 'name', direction: 'ascending' })).toEqual([basel, geneva, zurich]);
        expect(sortLocations(locations, { column: 'name', direction: 'descending' })).toEqual([zurich, geneva, basel]);
    });

    test('sorts by most recent sample', () => {
        expect(sortLocations(locations, { column: 'mostRecentSampleDate', direction: 'descending' })).toEqual([
            zurich,
            basel,
            geneva,
        ]);
    });

    test('sorts by amplicon sequences', () => {
        expect(sortLocations(locations, { column: 'totalReads', direction: 'ascending' })).toEqual([
            geneva,
            zurich,
            basel,
        ]);
    });

    test('keeps locations with the same value in alphabetical order, in either direction', () => {
        expect(sortLocations(locations, { column: 'sampleCount', direction: 'descending' })).toEqual([
            geneva,
            basel,
            zurich,
        ]);
        expect(sortLocations(locations, { column: 'sampleCount', direction: 'ascending' })).toEqual([
            basel,
            zurich,
            geneva,
        ]);
    });

    test('does not reorder the locations it is given', () => {
        sortLocations(locations, DEFAULT_LOCATION_SORT);
        expect(locations).toEqual([geneva, zurich, basel]);
    });
});
