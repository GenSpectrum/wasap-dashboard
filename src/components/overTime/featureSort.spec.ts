import { describe, expect, test } from 'vitest';

import { DEFAULT_FEATURE_SORT, nextSort, sortRowLabels } from './featureSort';

describe('nextSort', () => {
    test('sorts by a new column, the row labels in their natural order', () => {
        expect(nextSort({ column: 'meanProportion', direction: 'ascending' }, 'rowLabel')).toEqual({
            column: 'rowLabel',
            direction: 'ascending',
        });
    });

    test('sorts by a new column, values highest first', () => {
        expect(nextSort(DEFAULT_FEATURE_SORT, 'meanProportion')).toEqual({
            column: 'meanProportion',
            direction: 'descending',
        });
        expect(nextSort(DEFAULT_FEATURE_SORT, 'jaccardIndex')).toEqual({
            column: 'jaccardIndex',
            direction: 'descending',
        });
    });

    test('reverses the direction when sorting by the same column again', () => {
        expect(nextSort(DEFAULT_FEATURE_SORT, 'rowLabel')).toEqual({ column: 'rowLabel', direction: 'descending' });
        expect(nextSort({ column: 'meanProportion', direction: 'descending' }, 'meanProportion')).toEqual({
            column: 'meanProportion',
            direction: 'ascending',
        });
    });
});

describe('sortRowLabels', () => {
    const rowLabels = ['A1T', 'C2G', 'G3A', 'T4C'];
    const values = {
        meanProportions: { A1T: 0.2, C2G: 0.5, G3A: 0.2, T4C: 0.9 },
        jaccardIndices: { A1T: 0.3, C2G: 0.8, T4C: 0.1 },
    };

    test('keeps the natural order when sorting by row label ascending', () => {
        expect(sortRowLabels(rowLabels, DEFAULT_FEATURE_SORT, values)).toEqual(rowLabels);
    });

    test('reverses the natural order when sorting by row label descending', () => {
        expect(sortRowLabels(rowLabels, { column: 'rowLabel', direction: 'descending' }, values)).toEqual([
            'T4C',
            'G3A',
            'C2G',
            'A1T',
        ]);
    });

    test('sorts by mean proportion, keeping the natural order of equal values', () => {
        expect(sortRowLabels(rowLabels, { column: 'meanProportion', direction: 'descending' }, values)).toEqual([
            'T4C',
            'C2G',
            'A1T',
            'G3A',
        ]);
        expect(sortRowLabels(rowLabels, { column: 'meanProportion', direction: 'ascending' }, values)).toEqual([
            'A1T',
            'G3A',
            'C2G',
            'T4C',
        ]);
    });

    test('sorts by Jaccard index, rows without one last in either direction', () => {
        expect(sortRowLabels(rowLabels, { column: 'jaccardIndex', direction: 'descending' }, values)).toEqual([
            'C2G',
            'A1T',
            'T4C',
            'G3A',
        ]);
        expect(sortRowLabels(rowLabels, { column: 'jaccardIndex', direction: 'ascending' }, values)).toEqual([
            'T4C',
            'A1T',
            'C2G',
            'G3A',
        ]);
    });

    test('keeps the natural order when sorting by Jaccard index without any', () => {
        expect(
            sortRowLabels(rowLabels, { column: 'jaccardIndex', direction: 'descending' }, { meanProportions: {} }),
        ).toEqual(rowLabels);
    });
});
