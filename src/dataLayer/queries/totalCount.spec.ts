import { describe, expect, test } from 'vitest';

import type { RhydbSchema } from './schema';
import { distinctCountQuery, readTotalCount, totalReadCountQuery } from './totalCount';

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

describe('the count queries', () => {
    test('totalReadCountQuery is a bare count', () => {
        expect(totalReadCountQuery(schema).render()).toBe('data.group(by := {}, aggs := {n := count()})');
        expect(totalReadCountQuery(schema, { locationNames: ['Basel (BS)'] }).render()).toBe(
            "data.filter(locationName = 'Basel (BS)').group(by := {}, aggs := {n := count()})",
        );
    });
    test('distinctCountQuery groups the whole table by the column, then counts the groups', () => {
        expect(distinctCountQuery(schema, 'sampleId').render()).toBe(
            'data.group(by := {sampleId}, aggs := {n := count()}).group(by := {}, aggs := {n := count()})',
        );
    });
});

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
