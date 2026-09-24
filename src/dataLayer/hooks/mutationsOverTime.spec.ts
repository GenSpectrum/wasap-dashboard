import { describe, expect, test } from 'vitest';

import {
    applyDisplayMutations,
    buildDateAxis,
    buildMatrix,
    codeToEmptyEntry,
    genesOf,
    positionTargets,
    toMutationEntries,
} from './mutationsOverTime';
import { getProportion } from '../../components/dataDisplay/overTime/proportionValue';
import { type OverallMutationRow, type PositionOverTimeRow } from '../queries';

describe('buildDateAxis', () => {
    test('buckets days, gap-fills, aligns totals', () => {
        const { requestedDateRanges, totalCountsByBucket } = buildDateAxis(
            [
                { name: '2026-06-01', count: 10 },
                { name: '2026-06-01', count: 5 },
                { name: '2026-06-03', count: 20 },
            ],
            'day',
            {},
        );
        expect(requestedDateRanges.map((b) => b.dateString)).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
        expect(totalCountsByBucket).toEqual([15, 0, 20]);
    });

    test('filter bounds win over the data extent', () => {
        const { requestedDateRanges } = buildDateAxis([{ name: '2026-06-10', count: 3 }], 'day', {
            samplingDateFrom: '2026-06-09',
            samplingDateTo: '2026-06-11',
        });
        expect(requestedDateRanges.map((b) => b.dateString)).toEqual(['2026-06-09', '2026-06-10', '2026-06-11']);
    });
});

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

describe('codeToEmptyEntry', () => {
    test('parses a substitution code into a zero-count/zero-proportion entry', () => {
        expect(codeToEmptyEntry('S:T19I')).toEqual({
            type: 'substitution',
            mutation: expect.objectContaining({ code: 'S:T19I' }),
            count: 0,
            proportion: 0,
        });
    });

    test('parses a deletion code into a zero-count/zero-proportion entry', () => {
        expect(codeToEmptyEntry('G510-')).toEqual({
            type: 'deletion',
            mutation: expect.objectContaining({ code: 'G510-' }),
            count: 0,
            proportion: 0,
        });
    });

    test('an unparseable code is null', () => {
        expect(codeToEmptyEntry('not a mutation code')).toBeNull();
    });
});

describe('applyDisplayMutations', () => {
    const fetched = toMutationEntries(
        [{ mutationFrom: 'C', mutationTo: 'T', sequenceName: 'main', position: 241, count: 90, coverage: 100 }],
        'nucleotide',
    );

    test('without displayMutations, fetched entries pass through unchanged', () => {
        expect(applyDisplayMutations(fetched, undefined)).toBe(fetched);
    });

    test('keeps a fetched entry, synthesizes a zero entry for a requested mutation the query missed', () => {
        const result = applyDisplayMutations(fetched, ['C241T', 'G510-']);
        expect(result.map((e) => e.mutation.code)).toEqual(['C241T', 'G510-']);
        expect(result[0]).toBe(fetched[0]);
        expect(result[1]).toMatchObject({ count: 0, proportion: 0 });
    });

    test('drops a requested code that does not even parse as a mutation', () => {
        expect(applyDisplayMutations([], ['not a mutation code'])).toEqual([]);
    });
});

describe('genesOf', () => {
    test('distinct genes of an AA display set, undefined for nucleotides or an open set', () => {
        expect(genesOf(['S:T19I', 'S:K356T', 'ORF1a:L100F'], 'amino acid')).toEqual(['S', 'ORF1a']);
        expect(genesOf(['C241T'], 'nucleotide')).toBeUndefined();
        expect(genesOf(undefined, 'amino acid')).toBeUndefined();
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
