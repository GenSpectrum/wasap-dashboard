// SPDX-License-Identifier: GPL-3.0-or-later
// Derived from LolliPop (https://github.com/cbg-ethz/LolliPop); see lollipop/README.md.

/**
 * The bit of linear algebra the deconvolution needs, for the small dense problems it has: a
 * handful of columns (one per lineage of the panel) and a few thousand rows.
 *
 * Matrices are arrays of rows.
 */

export type Matrix = number[][];

/**
 * Non-negative least squares, `min ‖Ax − b‖` subject to `x ≥ 0`: the active-set algorithm of
 * Lawson and Hanson, as in `scipy.optimize.nnls`.
 *
 * Takes the normal equations `AᵀA` and `Aᵀb` instead of `A` and `b`, which is fine for the few,
 * well separated columns a panel has, and makes every iteration independent of the number of rows.
 */
export function nnls(ata: Matrix, atb: readonly number[]): number[] {
    const n = atb.length;
    const tolerance = 1e-12 * Math.max(1, ...atb.map(Math.abs));
    const x = new Array<number>(n).fill(0);
    const passive = new Array<boolean>(n).fill(false);
    const gradient = () => atb.map((value, j) => value - ata[j].reduce((sum, ajk, k) => sum + ajk * x[k], 0));

    for (let iteration = 0; iteration < 3 * n + 3; iteration++) {
        const w = gradient();
        let next = -1;
        for (let j = 0; j < n; j++) {
            if (!passive[j] && w[j] > tolerance && (next === -1 || w[j] > w[next])) {
                next = j;
            }
        }
        if (next === -1) {
            break;
        }
        passive[next] = true;

        for (;;) {
            const s = solvePassive(ata, atb, passive);
            if (s === undefined) {
                // The new column depends on the passive ones: it can't improve the fit.
                passive[next] = false;
                return x;
            }
            if (s.every((value, j) => !passive[j] || value > 0)) {
                s.forEach((value, j) => (x[j] = value));
                break;
            }
            let alpha = Infinity;
            for (let j = 0; j < n; j++) {
                if (passive[j] && s[j] <= 0) {
                    alpha = Math.min(alpha, x[j] / (x[j] - s[j]));
                }
            }
            for (let j = 0; j < n; j++) {
                x[j] += alpha * (s[j] - x[j]);
                if (passive[j] && x[j] <= tolerance) {
                    passive[j] = false;
                    x[j] = 0;
                }
            }
        }
    }
    return x;
}

/** Solves the normal equations restricted to the passive columns; the others are 0. */
function solvePassive(ata: Matrix, atb: readonly number[], passive: readonly boolean[]): number[] | undefined {
    const indices = passive.flatMap((isPassive, j) => (isPassive ? [j] : []));
    const inverse = invert(indices.map((j) => indices.map((k) => ata[j][k])));
    if (inverse === undefined) {
        return undefined;
    }
    const result = new Array<number>(passive.length).fill(0);
    indices.forEach((j, row) => {
        result[j] = inverse[row].reduce((sum, value, column) => sum + value * atb[indices[column]], 0);
    });
    return result;
}

/**
 * The inverse of a square matrix (Gauss–Jordan with partial pivoting), or `undefined` if it is
 * singular. Like `numpy.linalg.inv`, only an exactly zero pivot counts as singular — a nearly
 * singular matrix gets a huge inverse.
 */
export function invert(matrix: Matrix): Matrix | undefined {
    const n = matrix.length;
    const work = matrix.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
    for (let column = 0; column < n; column++) {
        let pivot = column;
        for (let row = column + 1; row < n; row++) {
            if (Math.abs(work[row][column]) > Math.abs(work[pivot][column])) {
                pivot = row;
            }
        }
        if (work[pivot][column] === 0) {
            return undefined;
        }
        [work[column], work[pivot]] = [work[pivot], work[column]];
        const scale = work[column][column];
        for (let k = 0; k < 2 * n; k++) {
            work[column][k] /= scale;
        }
        for (let row = 0; row < n; row++) {
            const factor = work[row][column];
            if (row !== column && factor !== 0) {
                for (let k = 0; k < 2 * n; k++) {
                    work[row][k] -= factor * work[column][k];
                }
            }
        }
    }
    return work.map((row) => row.slice(n));
}

export function dot(a: readonly number[], b: readonly number[]): number {
    return a.reduce((result, value, i) => result + value * b[i], 0);
}

export function sum(values: readonly number[]): number {
    return values.reduce((result, value) => result + value, 0);
}
