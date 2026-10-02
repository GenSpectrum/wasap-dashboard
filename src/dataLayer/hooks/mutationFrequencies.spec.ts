import { describe, expect, it } from 'vitest';

import { MIN_COVERAGE, mutationFrequencies } from './mutationFrequencies';

describe('mutationFrequencies', () => {
    const row = (sampleId: string, sym: string | null, count: number) => ({ sampleId, date: '2026-05-04', sym, count });

    it('counts bases and deletions as coverage, but not N', () => {
        const rows = new Map([
            [241, [row('S1', 'T', 30), row('S1', 'C', 60), row('S1', '-', 10), row('S1', 'N', 1000)]],
        ]);

        expect(mutationFrequencies(['C241T'], rows)).toEqual([
            { sampleId: 'S1', date: '2026-05-04', mutation: 'C241T', frac: 0.3, coverage: 100 },
        ]);
    });

    it('gives every mutation at a position its own frequency', () => {
        const rows = new Map([[241, [row('S1', 'T', 25), row('S1', 'A', 75)]]]);

        expect(mutationFrequencies(['C241T', 'C241A'], rows).map(({ mutation, frac }) => [mutation, frac])).toEqual([
            ['C241T', 0.25],
            ['C241A', 0.75],
        ]);
    });

    it('leaves out samples with too little coverage', () => {
        const rows = new Map([[241, [row('S1', 'T', MIN_COVERAGE - 1), row('S2', 'C', MIN_COVERAGE)]]]);

        expect(mutationFrequencies(['C241T'], rows)).toEqual([
            { sampleId: 'S2', date: '2026-05-04', mutation: 'C241T', frac: 0, coverage: MIN_COVERAGE },
        ]);
    });
});
