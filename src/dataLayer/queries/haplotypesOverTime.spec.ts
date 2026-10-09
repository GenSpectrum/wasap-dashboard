import { describe, expect, test } from 'vitest';

import { haplotypesOverTimeQuery, readHaplotypesOverTime } from './haplotypesOverTime';
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

describe('haplotypesOverTimeQuery', () => {
    test('maps one symbol column per position, then groups by the date and all of them', () => {
        expect(haplotypesOverTimeQuery(schema, { locationName: 'Zürich (ZH)' }, 'main', [2000, 2100]).render()).toBe(
            "data.filter(locationName = 'Zürich (ZH)')" +
                '.map({date := date, p2000 := main.at(2000), p2100 := main.at(2100)})' +
                '.group(by := {date, p2000, p2100}, aggs := {count := count()})',
        );
    });
});

describe('readHaplotypesOverTime', () => {
    test('reads the symbols in the order of the positions', () => {
        expect(
            readHaplotypesOverTime([{ date: '2026-01-11', p2000: 'A', p2100: null, count: 3 }], 'date', [2000, 2100]),
        ).toEqual([{ date: '2026-01-11', symbols: ['A', null], count: 3 }]);
    });
});
