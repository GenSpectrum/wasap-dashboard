import { describe, expect, test } from 'vitest';

import type { SiloSchema } from './schema';
import { readSymbolsBySample, symbolsBySampleQuery } from './symbolsBySample';

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

describe('symbolsBySampleQuery', () => {
    test('scopes the reads, maps one column per position, then groups by sample, date and all of them', () => {
        const filter = { locationName: 'Zürich (ZH)', samplingDateFrom: '2026-05-01', samplingDateTo: '2026-08-31' };

        expect(symbolsBySampleQuery(schema, filter, 'main', [241, 670]).render()).toBe(
            "default.filter(locationName = 'Zürich (ZH)' && date >= '2026-05-01' && date <= '2026-08-31')" +
                '.map({p241 := main.at(241), p670 := main.at(670)})' +
                '.groupBy({count := count()}, {sampleId, date, p241, p670})',
        );
    });
});

describe('readSymbolsBySample', () => {
    test('sums the joint counts into the counts of each position on its own', () => {
        const rows = [
            { sampleId: 'A1', date: '2026-05-04', p241: 'T', p670: 'N', count: 3 },
            { sampleId: 'A1', date: '2026-05-04', p241: 'N', p670: 'G', count: 5 },
            { sampleId: 'A1', date: '2026-05-04', p241: 'N', p670: 'T', count: 2 },
            { sampleId: 'A2', date: '2026-05-05', p241: 'T', p670: 'G', count: 1 },
        ];

        const result = readSymbolsBySample(rows, schema, [241, 670]);

        expect(result.get(241)).toEqual([
            { sampleId: 'A1', date: '2026-05-04', sym: 'T', count: 3 },
            { sampleId: 'A1', date: '2026-05-04', sym: 'N', count: 7 },
            { sampleId: 'A2', date: '2026-05-05', sym: 'T', count: 1 },
        ]);
        expect(result.get(670)).toEqual([
            { sampleId: 'A1', date: '2026-05-04', sym: 'N', count: 3 },
            { sampleId: 'A1', date: '2026-05-04', sym: 'G', count: 5 },
            { sampleId: 'A1', date: '2026-05-04', sym: 'T', count: 2 },
            { sampleId: 'A2', date: '2026-05-05', sym: 'G', count: 1 },
        ]);
    });
});
