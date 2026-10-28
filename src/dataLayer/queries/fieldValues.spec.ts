import { describe, expect, test } from 'vitest';

import { stringFieldValuesQuery } from './fieldValues';
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

describe('stringFieldValuesQuery', () => {
    test('stringFieldValuesQuery groups the whole table by the given column', () => {
        expect(stringFieldValuesQuery(schema, 'locationName').render()).toBe(
            'data.group(by := {locationName}, aggs := {n := count()})',
        );
    });
});
