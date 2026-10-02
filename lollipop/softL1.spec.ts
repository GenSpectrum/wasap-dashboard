// SPDX-License-Identifier: GPL-3.0-or-later
// Derived from LolliPop (https://github.com/cbg-ethz/LolliPop); see lollipop/README.md.

import { describe, expect, it } from 'vitest';

import { softL1Fit } from './softL1';

/** Rows as 0/1 patterns scaled by a weight, the way the deconvolution passes them. */
function fit(rows: { pattern: number[]; k: number; y: number }[], fScale: number) {
    const patterns = [...new Map(rows.map((row) => [row.pattern.join(), row.pattern])).values()];
    const index = (pattern: number[]) => patterns.findIndex((candidate) => candidate.join() === pattern.join());
    return softL1Fit(
        patterns,
        Int32Array.from(rows.map((row) => index(row.pattern))),
        Float64Array.from(rows.map((row) => row.k)),
        Float64Array.from(rows.map((row) => row.y)),
        rows.length,
        fScale,
    );
}

describe('softL1Fit', () => {
    it('should fit data without noise exactly', () => {
        const x = fit(
            [
                { pattern: [1, 0], k: 1, y: 0.7 },
                { pattern: [0, 1], k: 1, y: 0.3 },
                { pattern: [1, 1], k: 1, y: 1 },
            ],
            0.01,
        );

        expect(x[0]).toBeCloseTo(0.7, 6);
        expect(x[1]).toBeCloseTo(0.3, 6);
    });

    it('should keep the coefficients non-negative', () => {
        const x = fit(
            [
                { pattern: [1, 0], k: 1, y: 0.5 },
                { pattern: [0, 1], k: 1, y: -0.4 },
            ],
            0.01,
        );

        expect(x[0]).toBeCloseTo(0.5, 6);
        expect(x[1]).toBe(0);
    });

    it('should not be pulled by an outlier the way least squares is', () => {
        // Four rows say 0.2, one wild one says 0.9: least squares gives their mean, 0.34.
        const rows = [0.2, 0.2, 0.2, 0.2, 0.9].map((y) => ({ pattern: [1], k: 1, y }));

        // `scipy.optimize.least_squares(loss='soft_l1', f_scale=0.01)` gives 0.20258171.
        expect(fit(rows, 0.01)[0]).toBeCloseTo(0.20258171, 6);
        expect(fit(rows, 100)[0]).toBeCloseTo(0.34, 3);
    });

    it('should weigh the rows by their scale', () => {
        const x = fit(
            [
                { pattern: [1], k: 1, y: 0.2 },
                { pattern: [1], k: 0.1, y: 0.9 },
            ],
            100,
        );

        // Least squares on the scaled rows: (1·0.2 + 0.01·0.9) / 1.01
        expect(x[0]).toBeCloseTo(0.209 / 1.01, 6);
    });
});
