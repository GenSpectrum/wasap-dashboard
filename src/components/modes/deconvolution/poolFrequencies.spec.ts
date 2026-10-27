import { describe, expect, it } from 'vitest';

import { poolFrequencies } from './poolFrequencies';

describe('poolFrequencies', () => {
    const frequency = (sampleId: string, date: string, frac: number, coverage: number) => ({
        sampleId,
        date,
        mutation: 'C241T',
        frac,
        coverage,
    });

    it('keeps every sample by day', () => {
        const frequencies = [frequency('S1', '2026-05-04', 0.5, 100), frequency('S2', '2026-05-04', 0.1, 50)];

        expect(poolFrequencies(frequencies, 'day')).toEqual([
            { date: '2026-05-04', mutation: 'C241T', frac: 0.5 },
            { date: '2026-05-04', mutation: 'C241T', frac: 0.1 },
        ]);
    });

    it('pools the reads of the samples of a week, dated to its Monday', () => {
        // 2026-05-04 is a Monday, 2026-05-07 the Thursday of the same week, 2026-05-11 the next Monday.
        const frequencies = [
            frequency('S1', '2026-05-04', 0.5, 100),
            frequency('S2', '2026-05-07', 0.2, 300),
            frequency('S3', '2026-05-11', 0.9, 10),
        ];

        expect(poolFrequencies(frequencies, 'week')).toEqual([
            { date: '2026-05-04', mutation: 'C241T', frac: (50 + 60) / 400 },
            { date: '2026-05-11', mutation: 'C241T', frac: 0.9 },
        ]);
    });
});
