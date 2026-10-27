import { describe, expect, test } from 'vitest';

import {
    detectAmpliconRange,
    entropyInRange,
    groupByPosition,
    labelFor,
    selectDiversePositions,
} from './ampliconPositions';
import { type AmpliconPositionRow } from '../../queries/ampliconPositions';

describe('groupByPosition', () => {
    test('reconstructs coverage and the alt-symbol counts per position', () => {
        const rows: AmpliconPositionRow[] = [
            { position: 100, mutationFrom: 'C', mutationTo: 'T', count: 5, coverage: 100 },
            { position: 100, mutationFrom: 'C', mutationTo: 'G', count: 2, coverage: 100 },
            { position: 101, mutationFrom: 'A', mutationTo: 'C', count: 1, coverage: 50 },
        ];
        const grouped = groupByPosition(rows);
        expect(grouped.get(100)).toEqual({
            coverage: 100,
            ref: 'C',
            alts: new Map([
                ['T', 5],
                ['G', 2],
            ]),
        });
        expect(grouped.get(101)).toEqual({ coverage: 50, ref: 'A', alts: new Map([['C', 1]]) });
    });
});

describe('detectAmpliconRange', () => {
    function byPosition(entries: [number, number][]) {
        return new Map(entries.map(([position, coverage]) => [position, { coverage, ref: 'A', alts: new Map() }]));
    }

    test('finds the contiguous run around the anchor at the coverage threshold', () => {
        const positions = byPosition([
            [78, 5], // below threshold: outside the amplicon
            [79, 10_000_000],
            [80, 10_000_500],
            [81, 9_999_800],
            [82, 30], // below threshold: the cliff
        ]);
        expect(detectAmpliconRange(positions, 80, 10_000_500)).toEqual({ start: 79, end: 81 });
    });

    test('a background hit far from the anchor does not extend the range', () => {
        const positions = byPosition([
            [79, 10_000_000],
            [80, 10_000_500],
            [200, 33], // isolated chimeric/background noise elsewhere
        ]);
        expect(detectAmpliconRange(positions, 79, 10_000_000)).toEqual({ start: 79, end: 80 });
    });

    test('null when the anchor itself does not clear its own threshold (degenerate input)', () => {
        const positions = byPosition([[79, 100]]);
        expect(detectAmpliconRange(positions, 79, 1_000_000)).toBeNull();
    });
});

describe('entropyInRange', () => {
    test('a monomorphic position has zero entropy', () => {
        const positions = new Map([[10, { coverage: 1000, ref: 'A', alts: new Map() }]]);
        const [result] = entropyInRange(positions, 10, 10);
        expect(result.entropyBits).toBe(0);
        expect(result.distribution).toEqual({ A: 1000 });
    });

    test('an even two-way split has entropy of 1 bit', () => {
        const positions = new Map([[10, { coverage: 1000, ref: 'A', alts: new Map([['T', 500]]) }]]);
        const [result] = entropyInRange(positions, 10, 10);
        expect(result.entropyBits).toBeCloseTo(1, 6);
        expect(result.distribution).toEqual({ A: 500, T: 500 });
    });

    test('sorts by entropy descending and skips positions with no data', () => {
        const positions = new Map([
            [10, { coverage: 1000, ref: 'A', alts: new Map() }], // 0 bits
            [12, { coverage: 1000, ref: 'A', alts: new Map([['T', 500]]) }], // 1 bit
            // 11 has no entry at all - a gap inside the requested range
        ]);
        const results = entropyInRange(positions, 10, 12);
        expect(results.map((r) => r.position)).toEqual([12, 10]);
    });
});

describe('selectDiversePositions', () => {
    test('keeps only positions above the cutoff, most variable first', () => {
        const results = [
            { position: 1, ref: 'A', coverage: 1, distribution: {}, entropyBits: 0.05 },
            { position: 2, ref: 'A', coverage: 1, distribution: {}, entropyBits: 0.9 },
            { position: 3, ref: 'A', coverage: 1, distribution: {}, entropyBits: 0.6 },
        ];
        expect(selectDiversePositions(results, 0.5)).toEqual([2, 3]);
    });

    test('caps at MAX_COOCCURRENCE_POSITIONS', () => {
        const results = Array.from({ length: 20 }, (_, i) => ({
            position: i,
            ref: 'A',
            coverage: 1,
            distribution: {},
            entropyBits: 1,
        }));
        expect(selectDiversePositions(results, 0.1)).toHaveLength(10);
    });
});

describe('labelFor', () => {
    test('nucleotide: bare position number', () => {
        expect(labelFor(23403, 'nucleotide', undefined)).toBe('23403');
    });

    test('amino acid: gene-qualified', () => {
        expect(labelFor(501, 'amino acid', 'S')).toBe('S:501');
    });
});
