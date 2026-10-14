import { describe, expect, test } from 'vitest';

import { positionsCooccurrenceQuery, readCooccurrenceRows } from './cooccurrence';
import type { SiloSchema } from './schema';

const schema: SiloSchema = {
    table: 'default',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

describe('positionsCooccurrenceQuery', () => {
    test('maps one symbol column per target, then groups by date + all of them, bare', () => {
        expect(
            positionsCooccurrenceQuery(schema, {}, [
                { sequenceName: 'main', position: 241 },
                { sequenceName: 'main', position: 23403 },
            ]).render(),
        ).toBe(
            'default.map({sym0 := main.at(241), sym1 := main.at(23403)})' +
                '.group(by := {date, sym0, sym1}, aggs := {count := count()})',
        );
    });

    test('narrows by the given filter, and amino acid targets use the gene column', () => {
        expect(
            positionsCooccurrenceQuery(schema, { locationName: 'Zürich (ZH)' }, [
                { sequenceName: 'S', position: 501 },
            ]).render(),
        ).toBe(
            "default.filter(locationName = 'Zürich (ZH)').map({sym0 := S.at(501)})" +
                '.group(by := {date, sym0}, aggs := {count := count()})',
        );
    });
});

describe('readCooccurrenceRows', () => {
    const targets = [
        { sequenceName: 'main', position: 241 },
        { sequenceName: 'main', position: 23403 },
    ];

    test('reads date, one symbol per target in order, and count', () => {
        expect(
            readCooccurrenceRows([{ date: '2026-06-01', sym0: 'C', sym1: null, count: 5 }], 'date', targets),
        ).toEqual([{ date: '2026-06-01', symbols: ['C', null], count: 5 }]);
    });

    test('a missing symbol value is read as absent', () => {
        expect(
            readCooccurrenceRows([{ date: '2026-06-01', sym0: null, sym1: null, count: 1 }], 'date', targets),
        ).toEqual([{ date: '2026-06-01', symbols: [null, null], count: 1 }]);
    });
});
