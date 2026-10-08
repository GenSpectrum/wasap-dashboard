import { describe, expect, test } from 'vitest';

import {
    allRowsOf,
    buildAmpliconCooccurrence,
    cooccurrenceRows,
    cooccurrenceTableData,
    MAX_MUTATIONS_TO_LEAVE_TWO_OUT,
    type CooccurrenceRow,
} from './ampliconCooccurrence';
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

    test('has a row of all the mutations, then one per cluster seen on reads, counting the reads with at least its mutations', () => {
        const group = groupOf(['C100T', 'A200-', 'A200G', 'G300A']);
        const rows = [
            { date: '2026-06-01', symbols: ['T', '-', 'A'], count: 40 },
            { date: '2026-06-01', symbols: ['T', 'A', 'A'], count: 5 },
            { date: '2026-06-01', symbols: ['T', 'A', 'G'], count: 3 },
            { date: '2026-06-01', symbols: ['C', 'A', 'G'], count: 2 },
        ];
        const cooccurrence = buildAmpliconCooccurrence(group, rows, requestedDateRanges, 'day');

        const rowsOfTable = cooccurrenceRows([cooccurrence], [100, 50]).flatMap(allRowsOf);

        // Only C100T on its own, or none of them, is no cluster.
        expect(rowsOfTable.map((row) => row.label)).toEqual([
            'Amplicon 7: C100T + A200- + A200G + G300A',
            'Amplicon 7: ≥3 of C100T, A200-, A200G, G300A',
            'Amplicon 7: A200- + A200G + G300A',
            'Amplicon 7: C100T + A200G + G300A',
            'Amplicon 7: C100T + A200- + G300A',
            'Amplicon 7: C100T + A200- + A200G',
            'Amplicon 7: ≥2 of C100T, A200-, A200G, G300A',
            'Amplicon 7: A200G + G300A',
            'Amplicon 7: A200- + G300A',
            'Amplicon 7: A200- + A200G',
            // Seen on reads, too: once, among those leaving two out.
            'Amplicon 7: C100T + G300A',
            'Amplicon 7: C100T + A200G',
            'Amplicon 7: C100T + A200-',
            'Amplicon 7: C100T',
            'Amplicon 7: A200-',
            'Amplicon 7: A200G',
            'Amplicon 7: G300A',
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

    test('leaves out the combinations on less than 1% of the spanning reads, but not the one of all mutations', () => {
        const group = groupOf(['C100T', 'G200A', 'G300A']);
        const rows = [
            // positions 100, 200, 300
            { date: '2026-06-01', symbols: ['C', 'G', 'G'], count: 998 },
            { date: '2026-06-01', symbols: ['T', 'G', 'A'], count: 1 },
            { date: '2026-06-01', symbols: ['T', 'A', 'A'], count: 1 },
        ];
        const cooccurrence = buildAmpliconCooccurrence(group, rows, requestedDateRanges, 'day');

        expect(
            cooccurrenceRows([cooccurrence], [1000, 0])
                .flatMap(allRowsOf)
                .map((row) => row.label),
        ).toEqual([
            'Amplicon 7: C100T + G200A + G300A',
            'Amplicon 7: ≥2 of C100T, G200A, G300A',
            'Amplicon 7: G200A + G300A',
            'Amplicon 7: C100T + G300A',
            'Amplicon 7: C100T + G200A',
            'Amplicon 7: C100T',
            'Amplicon 7: G200A',
            'Amplicon 7: G300A',
        ]);
        expect(
            cooccurrenceRows(
                [buildAmpliconCooccurrence(groupOf(['C100T', 'G300A']), rows, requestedDateRanges, 'day')],
                [1000, 0],
            )
                .flatMap(allRowsOf)
                .map((row) => row.label),
        ).toEqual(['Amplicon 7: C100T + G300A', 'Amplicon 7: C100T', 'Amplicon 7: G300A']);
    });

    test('has the rows of any all but one and of each all but one of the mutations, of three or more, after all of them, but none leaving two out of three', () => {
        const group = groupOf(['C100T', 'G200A', 'G300A']);
        const rows = [
            { date: '2026-06-01', symbols: ['T', 'A', 'A'], count: 40 },
            { date: '2026-06-01', symbols: ['T', 'G', 'A'], count: 30 },
            { date: '2026-06-01', symbols: ['C', 'A', 'A'], count: 20 },
            { date: '2026-06-01', symbols: ['T', 'G', 'G'], count: 10 },
        ];
        const cooccurrence = buildAmpliconCooccurrence(group, rows, requestedDateRanges, 'day');

        const [{ all, anyOf, observed, singles }] = cooccurrenceRows([cooccurrence], [100, 50]);

        const countsOf = (rows: CooccurrenceRow[]) =>
            rows.map(({ label, values: [value] }) => [label, value?.type === 'value' ? value.count : undefined]);
        expect(countsOf([all])).toEqual([['Amplicon 7: C100T + G200A + G300A', 40]]);
        expect(anyOf.map(({ row, clusters }) => [countsOf([row]), countsOf(clusters)])).toEqual([
            [
                [['Amplicon 7: ≥2 of C100T, G200A, G300A', 90]],
                [
                    ['Amplicon 7: G200A + G300A', 60],
                    ['Amplicon 7: C100T + G300A', 70],
                    ['Amplicon 7: C100T + G200A', 40],
                ],
            ],
        ]);
        // All the combinations seen on reads are among those leaving one out.
        expect(observed).toEqual([]);
        expect(countsOf(singles)).toEqual([
            ['Amplicon 7: C100T', 80],
            ['Amplicon 7: G200A', 60],
            ['Amplicon 7: G300A', 90],
        ]);
    });

    test(`leaves two out only of up to ${MAX_MUTATIONS_TO_LEAVE_TWO_OUT} mutations`, () => {
        const codes = (count: number) => Array.from({ length: count }, (_, index) => `A${100 + index * 10}G`);
        const atLeastRows = (count: number) =>
            cooccurrenceRows(
                [buildAmpliconCooccurrence(groupOf(codes(count)), [], requestedDateRanges, 'day')],
                [100, 50],
            )[0].anyOf.map(({ row }) => row.atLeast);

        expect(atLeastRows(MAX_MUTATIONS_TO_LEAVE_TWO_OUT)).toEqual([11, 10]);
        expect(atLeastRows(MAX_MUTATIONS_TO_LEAVE_TWO_OUT + 1)).toEqual([12]);
    });

    test('puts the rows into the shape of the feature bands, by label and date', () => {
        const group = groupOf(['C100T', 'G300A']);
        const rows = [{ date: '2026-06-01', symbols: ['T', 'A', 'A'], count: 5 }];
        const cooccurrence = buildAmpliconCooccurrence(group, rows, requestedDateRanges, 'day');
        const [{ all: row }] = cooccurrenceRows([cooccurrence], [100, 50]);

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
