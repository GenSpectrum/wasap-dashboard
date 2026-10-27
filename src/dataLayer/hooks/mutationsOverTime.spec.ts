import { describe, expect, test } from 'vitest';

import { buildDateAxis } from './dateAxis';
import {
    buildMatrix,
    mutationsInRange,
    overallFromPositions,
    positionTargets,
    toMutationEntries,
} from './mutationsOverTime';
import { getProportion } from '../../components/overTime/proportionValue';
import { type OverallMutationRow, type PositionOverTimeRow } from '../queries';

describe('toMutationEntries', () => {
    test('nucleotide codes unprefixed, proportion = count/coverage', () => {
        const rows: OverallMutationRow[] = [
            { mutationFrom: 'C', mutationTo: 'T', sequenceName: 'main', position: 241, count: 90, coverage: 100 },
            { mutationFrom: 'G', mutationTo: '-', sequenceName: 'main', position: 510, count: 5, coverage: 10 },
        ];
        const entries = toMutationEntries(rows, 'nucleotide');
        expect(entries.map((e) => e.mutation.code)).toEqual(['C241T', 'G510-']);
        expect(entries[0].proportion).toBe(0.9);
    });

    test('amino-acid codes keep the gene', () => {
        expect(
            toMutationEntries(
                [{ mutationFrom: 'T', mutationTo: 'I', sequenceName: 'S', position: 19, count: 8, coverage: 10 }],
                'amino acid',
            )[0].mutation.code,
        ).toBe('S:T19I');
    });
});

describe('overallFromPositions', () => {
    const byPosition = new Map<string, PositionOverTimeRow[]>([
        [
            'main:241',
            [
                { date: '2026-06-01', sym: 'T', count: 90 },
                { date: '2026-06-01', sym: 'C', count: 5 },
                { date: '2026-06-02', sym: 'T', count: 3 },
                { date: '2026-06-02', sym: 'C', count: 2 },
                { date: '2026-06-02', sym: 'N', count: 50 },
                { date: '2026-06-02', sym: null, count: 50 },
            ],
        ],
        ['main:510', [{ date: '2026-06-01', sym: 'N', count: 7 }]],
    ]);

    test('sums the alt reads over the covering reads of every day', () => {
        const [entry] = overallFromPositions(['C241T'], 'nucleotide', 'main', byPosition);
        expect(entry).toMatchObject({ type: 'substitution', count: 93, proportion: 0.93 });
        expect(entry.mutation.code).toBe('C241T');
    });

    test('a deletion counts the `-` reads', () => {
        const rows = new Map([
            [
                'main:510',
                [
                    { date: '2026-06-01', sym: '-', count: 1 },
                    { date: '2026-06-01', sym: 'G', count: 3 },
                ],
            ],
        ]);
        expect(overallFromPositions(['G510-'], 'nucleotide', 'main', rows)).toMatchObject([
            { type: 'deletion', count: 1, proportion: 0.25 },
        ]);
    });

    test('a position without covering reads, or without rows, is a zero, not dropped', () => {
        expect(overallFromPositions(['G510A', 'C3037T'], 'nucleotide', 'main', byPosition)).toMatchObject([
            { count: 0, proportion: 0 },
            { count: 0, proportion: 0 },
        ]);
    });

    test('amino acid: looks up the gene of the code, X is not coverage', () => {
        const rows = new Map([
            [
                'S:19',
                [
                    { date: '2026-06-01', sym: 'I', count: 8 },
                    { date: '2026-06-01', sym: 'T', count: 2 },
                    { date: '2026-06-01', sym: 'X', count: 30 },
                ],
            ],
        ]);
        expect(overallFromPositions(['S:T19I'], 'amino acid', 'main', rows)).toMatchObject([
            { count: 8, proportion: 0.8 },
        ]);
    });

    test('drops a code that does not parse as a mutation', () => {
        expect(overallFromPositions(['not a mutation code'], 'nucleotide', 'main', byPosition)).toEqual([]);
    });
});

describe('positionTargets', () => {
    test('one target per distinct position; nucleotide uses the given sequence name', () => {
        expect(positionTargets(['C241T', 'C241A', 'C3037T'], 'nucleotide', 'main')).toEqual([
            { sequenceName: 'main', position: 241 },
            { sequenceName: 'main', position: 3037 },
        ]);
    });

    test('amino acid uses the gene from the code', () => {
        expect(positionTargets(['S:T19I', 'S:T19K', 'ORF1a:L100F'], 'amino acid', 'main')).toEqual([
            { sequenceName: 'S', position: 19 },
            { sequenceName: 'ORF1a', position: 100 },
        ]);
    });
});

describe('buildMatrix', () => {
    const { requestedDateRanges, totalCountsByBucket } = buildDateAxis(
        [
            { name: '2026-06-01', count: 950 },
            { name: '2026-06-08', count: 0 },
        ],
        'week',
        {},
    );
    const [w1, w2] = requestedDateRanges;

    test('a covered cell is count/coverage; a mutation absent-with-coverage is a true zero', () => {
        // position 241: week 1 has T=900, C=45, N=5 → coverage 945, alt-T = 900
        const byPosition = new Map<string, PositionOverTimeRow[]>([
            [
                'main:241',
                [
                    { date: '2026-06-01', sym: 'T', count: 900 },
                    { date: '2026-06-01', sym: 'C', count: 45 },
                    { date: '2026-06-01', sym: 'N', count: 5 },
                    { date: '2026-06-03', sym: 'C', count: 10 }, // same bucket (week), no T
                ],
            ],
        ]);
        const matrix = buildMatrix(['C241T'], 'week', 'nucleotide', 'main', [w1, w2], totalCountsByBucket, byPosition);
        const row = matrix.getFirstAxisKeys()[0];
        expect(getProportion(matrix.get(row, w1) ?? null)).toBeCloseTo(900 / 955);
        // week 2 had 0 total reads → null (no data), not zero
        expect(matrix.get(row, w2)).toBeNull();
    });

    test('a bucket with reads but no coverage at the position is noCoverage', () => {
        const byPosition = new Map<string, PositionOverTimeRow[]>([
            ['main:241', [{ date: '2026-06-01', sym: 'N', count: 950 }]],
        ]);
        const matrix = buildMatrix(['C241T'], 'week', 'nucleotide', 'main', [w1], [950], byPosition);
        expect(matrix.get(matrix.getFirstAxisKeys()[0], w1)).toEqual({ type: 'noCoverage', totalCount: 950 });
    });

    test('amino acid: X and null are excluded from coverage', () => {
        const { requestedDateRanges: dr } = buildDateAxis([{ name: '2026-06-01', count: 100 }], 'day', {});
        const byPosition = new Map<string, PositionOverTimeRow[]>([
            [
                'S:19',
                [
                    { date: '2026-06-01', sym: 'I', count: 8 },
                    { date: '2026-06-01', sym: 'T', count: 2 },
                    { date: '2026-06-01', sym: 'X', count: 30 },
                    { date: '2026-06-01', sym: null, count: 60 },
                ],
            ],
        ]);
        const matrix = buildMatrix(['S:T19I'], 'day', 'amino acid', 'main', dr, [100], byPosition);
        // coverage = 8 + 2 = 10 (X and null excluded); count(I) = 8
        expect(getProportion(matrix.get(matrix.getFirstAxisKeys()[0], dr[0]) ?? null)).toBeCloseTo(0.8);
    });
});

describe('mutationsInRange', () => {
    const rows = (counts: Record<string, number>): PositionOverTimeRow[] =>
        Object.entries(counts).map(([sym, count]) => ({ date: '2026-06-01', sym, count }));

    test('takes every symbol but the reference and unknown above the floor, in genome order', () => {
        const range = { reference: { name: 'main', sequence: 'ACGTA', length: 5 }, start: 2, length: 3 };
        const byPosition = new Map([
            ['main:2', rows({ C: 900, T: 100, N: 5000 })],
            ['main:3', rows({ G: 999_999, A: 1 })],
            ['main:4', rows({ T: 50, '-': 50 })],
        ]);

        expect(mutationsInRange(range, 'nucleotide', 'main', byPosition)).toEqual(['C2T', 'T4-']);
    });

    test('qualifies amino acid mutations with the gene', () => {
        const range = { reference: { name: 'S', sequence: 'MFV', length: 3 }, start: 1, length: 3 };
        const byPosition = new Map([['S:3', rows({ V: 10, A: 10, X: 100 })]]);

        expect(mutationsInRange(range, 'amino acid', 'main', byPosition)).toEqual(['S:V3A']);
    });
});
