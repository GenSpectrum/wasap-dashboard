// SPDX-License-Identifier: GPL-3.0-or-later
// Derived from LolliPop (https://github.com/cbg-ethz/LolliPop); see lollipop/README.md.

import { describe, expect, it } from 'vitest';

import { invert, nnls as nnlsFromNormalEquations, type Matrix } from './linearAlgebra';

/** `nnls` of `A` and `b` themselves. */
function nnls(a: Matrix, b: readonly number[]): number[] {
    const n = a[0].length;
    const ata = Array.from({ length: n }, (_, j) =>
        Array.from({ length: n }, (_unused, k) => a.reduce((sum, row) => sum + row[j] * row[k], 0)),
    );
    const atb = Array.from({ length: n }, (_, j) => a.reduce((sum, row, i) => sum + row[j] * b[i], 0));
    return nnlsFromNormalEquations(ata, atb);
}

describe('nnls', () => {
    it('should find the unconstrained solution when it is non-negative', () => {
        const a = [
            [1, 0],
            [0, 1],
            [1, 1],
        ];
        const x = nnls(a, [1, 2, 3]);
        expect(x[0]).toBeCloseTo(1, 12);
        expect(x[1]).toBeCloseTo(2, 12);
    });

    it('should clamp a coefficient that would be negative to 0', () => {
        const a = [
            [1, 0],
            [0, 1],
            [1, 1],
        ];
        // Unconstrained, the second coefficient would be negative.
        const x = nnls(a, [2, -1, 1]);
        expect(x[1]).toBe(0);
        expect(x[0]).toBeCloseTo(1.5, 12);
    });

    it('should return zeros when nothing can be explained', () => {
        expect(nnls([[1], [1]], [-1, -2])).toEqual([0]);
    });

    it('should not get stuck on a column that duplicates another one', () => {
        const a = [
            [1, 1, 0],
            [0, 0, 1],
        ];
        const x = nnls(a, [2, 1]);
        expect(x[0] + x[1]).toBeCloseTo(2, 12);
        expect(x[2]).toBeCloseTo(1, 12);
    });
});

describe('invert', () => {
    it('should invert a matrix that needs pivoting', () => {
        const inverse = invert([
            [0, 2],
            [1, 1],
        ])!;
        expect(inverse[0][0]).toBeCloseTo(-0.5, 12);
        expect(inverse[0][1]).toBeCloseTo(1, 12);
        expect(inverse[1][0]).toBeCloseTo(0.5, 12);
        expect(inverse[1][1]).toBeCloseTo(0, 12);
    });

    it('should return undefined for a singular matrix', () => {
        expect(
            invert([
                [1, 2],
                [2, 4],
            ]),
        ).toBeUndefined();
    });
});
