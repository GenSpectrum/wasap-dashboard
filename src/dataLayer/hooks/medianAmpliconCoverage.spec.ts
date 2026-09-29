import { describe, expect, test } from 'vitest';

import { medianAmpliconCoverageGrid, sampleAmpliconCoverages } from './medianAmpliconCoverage';
import { type SampleOverview } from '../queries';

function sample(sampleId: string, locationName: string, date: string): SampleOverview {
    return { sampleId, locationName, date, batchId: 'b1', reads: 1000 };
}

describe('sampleAmpliconCoverages', () => {
    test("takes the median over the amplicons of the reads that called a symbol at each one's position", () => {
        const samples = [sample('s1', 'Zürich', '2026-08-10'), sample('s2', 'Zürich', '2026-08-12')];
        const rowsByAmplicon = [
            [
                { sampleId: 's1', sym: 'A', count: 90 },
                { sampleId: 's1', sym: '-', count: 10 },
                { sampleId: 's1', sym: 'N', count: 500 },
                { sampleId: 's2', sym: 'C', count: 5 },
            ],
            [{ sampleId: 's1', sym: 'G', count: 40 }],
            [
                { sampleId: 's1', sym: 'T', count: 20 },
                { sampleId: 's2', sym: 'N', count: 700 },
            ],
        ];

        const coverages = sampleAmpliconCoverages(samples, rowsByAmplicon);

        // s1: 100, 40, 20 → 40; s2: 5, 0, 0 → 0
        expect(coverages.map(({ medianAmpliconReads }) => medianAmpliconReads)).toEqual([40, 0]);
        expect(coverages.map(({ amplifiedAmplicons }) => amplifiedAmplicons)).toEqual([3, 0]);
    });
});

describe('medianAmpliconCoverageGrid', () => {
    test("puts the samples into one row per location and one column per week, with each cell's median", () => {
        const withReads = (overview: SampleOverview, medianAmpliconReads: number) => ({
            ...overview,
            medianAmpliconReads,
            amplifiedAmplicons: 1,
        });
        const samples = [
            withReads(sample('z2', 'Zürich', '2026-08-06'), 30),
            withReads(sample('z1', 'Zürich', '2026-08-04'), 10),
            withReads(sample('g1', 'Genève', '2026-08-20'), 5),
        ];

        const grid = medianAmpliconCoverageGrid(samples, 96);

        expect(grid.locations).toEqual(['Genève', 'Zürich']);
        expect(grid.weeks.map((week) => week.dateString)).toEqual(['2026-W32', '2026-W33', '2026-W34']);
        expect(grid.cells.map((row) => row.map((cell) => cell.samples.map(({ sampleId }) => sampleId)))).toEqual([
            [[], [], ['g1']],
            [['z1', 'z2'], [], []],
        ]);
        expect(grid.cells.map((row) => row.map((cell) => cell.medianAmpliconReads))).toEqual([
            [null, null, 5],
            [20, null, null],
        ]);
    });
});
