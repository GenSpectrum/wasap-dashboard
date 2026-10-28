import { describe, expect, test } from 'vitest';

import { haplotypesOverTimeQuery, readHaplotypesOverTime } from './haplotypesOverTime';
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

describe('haplotypesOverTimeQuery', () => {
    test('maps one symbol column per position, then groups by the date and all of them', () => {
        expect(haplotypesOverTimeQuery(schema, { locationNames: ['Zürich (ZH)'] }, 'main', [2000, 2100]).render()).toBe(
            "data.filter(locationName = 'Zürich (ZH)')" +
                '.map({p2000 := main.at(2000), p2100 := main.at(2100)})' +
                '.group(by := {date, p2000, p2100}, aggs := {count := count()})',
        );
    });

    test('is narrowed to the sampling dates', () => {
        expect(haplotypesOverTimeQuery(schema, { samplingDateFrom: '2026-06-03' }, 'main', [2000, 2100]).render()).toBe(
            "data.filter(date >= '2026-06-03')" +
                '.map({p2000 := main.at(2000), p2100 := main.at(2100)})' +
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
