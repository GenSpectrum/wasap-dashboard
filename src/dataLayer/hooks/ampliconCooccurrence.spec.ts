import { describe, expect, test } from 'vitest';

import { buildAmpliconCooccurrence, cooccurrenceRows, cooccurrenceTableData } from './ampliconCooccurrence';
import { buildDateAxis } from './mutationsOverTime';
import { mutationsByAmplicon } from '../../amplicons/mutationsByAmplicon';
import { type Amplicon } from '../../amplicons/primerBed';

const amplicon: Amplicon = { chrom: 'ref', number: 7, pool: '1', start: 1, end: 400, insertStart: 30, insertEnd: 370 };

function groupOf(codes: string[]) {
    return mutationsByAmplicon(codes, [amplicon]).groups[0];
}

describe('buildAmpliconCooccurrence', () => {
    const { requestedDateRanges } = buildDateAxis(
        [
            { name: '2026-06-01', count: 100 },
            { name: '2026-06-02', count: 50 },
        ],
        'day',
        {},
    );

    test('sorts the reads that span every position into the combinations of mutations they carry', () => {
        const group = groupOf(['C100T', 'A200-', 'A200G', 'G300A']);
        const rows = [
            // positions 100, 200, 300
            { date: '2026-06-01', symbols: ['T', '-', 'A'], count: 40 },
            { date: '2026-06-01', symbols: ['C', 'A', 'G'], count: 10 },
            { date: '2026-06-01', symbols: ['T', 'G', 'G'], count: 5 },
            { date: '2026-06-01', symbols: ['T', 'N', 'A'], count: 30 },
            { date: '2026-06-01', symbols: [null, 'A', 'G'], count: 15 },
            { date: '2026-06-02', symbols: ['t', '-', 'A'], count: 7 },
        ];

        const cooccurrence = buildAmpliconCooccurrence(group, rows, requestedDateRanges, 'day');

        expect(cooccurrence.mutations.map((mutation) => mutation.code)).toEqual(['C100T', 'A200-', 'A200G', 'G300A']);
        expect(cooccurrence.spanning).toEqual([55, 7]);
        expect(cooccurrence.combinations).toEqual([
            { carries: [true, true, false, true], counts: [40, 7], total: 47 },
            { carries: [false, false, false, false], counts: [10, 0], total: 10 },
            { carries: [true, false, true, false], counts: [5, 0], total: 5 },
        ]);
    });

    test('has a row per cluster seen on reads, counting the reads with at least its mutations', () => {
        const group = groupOf(['C100T', 'A200-', 'A200G', 'G300A']);
        const rows = [
            { date: '2026-06-01', symbols: ['T', '-', 'A'], count: 40 },
            { date: '2026-06-01', symbols: ['T', 'A', 'A'], count: 5 },
            { date: '2026-06-01', symbols: ['T', 'A', 'G'], count: 3 },
            { date: '2026-06-01', symbols: ['C', 'A', 'G'], count: 2 },
        ];
        const cooccurrence = buildAmpliconCooccurrence(group, rows, requestedDateRanges, 'day');

        const rowsOfTable = cooccurrenceRows([cooccurrence], [100, 50]);

        // Only C100T on its own, or none of them, is no cluster.
        expect(rowsOfTable.map((row) => row.label)).toEqual([
            'Amplicon 7: C100T + A200- + G300A',
            'Amplicon 7: C100T + G300A',
        ]);
        const cellsOf = (label: string) => rowsOfTable.find((row) => row.label === label)!.values;
        expect(cellsOf('Amplicon 7: C100T + A200- + G300A')).toEqual([
            { type: 'value', count: 40, coverage: 50, totalCount: 100 },
            { type: 'noCoverage', totalCount: 50 },
        ]);
        // The 40 reads with A200- as well carry C100T and G300A, too.
        expect(cellsOf('Amplicon 7: C100T + G300A')[0]).toEqual({
            type: 'value',
            count: 45,
            coverage: 50,
            totalCount: 100,
        });
    });

    test('leaves out the combinations on less than 1% of the spanning reads', () => {
        const group = groupOf(['C100T', 'G300A']);
        const rows = [
            { date: '2026-06-01', symbols: ['C', 'A', 'G'], count: 999 },
            { date: '2026-06-01', symbols: ['T', 'A', 'A'], count: 1 },
        ];
        const cooccurrence = buildAmpliconCooccurrence(group, rows, requestedDateRanges, 'day');

        expect(cooccurrenceRows([cooccurrence], [1000, 0])).toEqual([]);
    });

    test('puts the rows into the shape of the feature bands, by label and date', () => {
        const group = groupOf(['C100T', 'G300A']);
        const rows = [{ date: '2026-06-01', symbols: ['T', 'A', 'A'], count: 5 }];
        const cooccurrence = buildAmpliconCooccurrence(group, rows, requestedDateRanges, 'day');
        const [row] = cooccurrenceRows([cooccurrence], [100, 50]);

        const data = cooccurrenceTableData([row], requestedDateRanges);

        expect([...data.keysFirstAxis.keys()]).toEqual(['Amplicon 7: C100T + G300A']);
        expect([...data.keysSecondAxis.keys()]).toEqual(['2026-06-01', '2026-06-02']);
        expect(data.data.get('Amplicon 7: C100T + G300A')?.get('2026-06-01')).toEqual({
            type: 'value',
            count: 5,
            coverage: 5,
            totalCount: 100,
        });
    });
});
