// SPDX-License-Identifier: GPL-3.0-or-later
// Derived from LolliPop (https://github.com/cbg-ethz/LolliPop); see lollipop/README.md.

/**
 * The robust regression at the heart of the deconvolution: LolliPop fits it with
 * `scipy.optimize.least_squares(loss='soft_l1', bounds=(0, 1))`, which has no counterpart in
 * JavaScript, so it is solved here.
 *
 * This finds the same minimum, without the upper bound of 1: the coefficients are prevalences that
 * add up to about 1, so the bound doesn't bind in practice. Where few samples carry weight, the
 * loss is so flat that SciPy's solver and this one stop a little apart (up to a few tenths of a
 * percent in the prevalences), at losses equal to within 1e-9.
 */

import { dot, invert, nnls, sum } from './linearAlgebra';

/** The fit stops when the coefficients change by less than this, relative to their sum. */
const TOLERANCE = 1e-7;
const MAX_ITERATIONS = 1000;

/**
 * `min Σ f²(√(1 + rᵢ²/f²) − 1)` subject to `x ≥ 0`, with the residuals `rᵢ = kᵢ(dᵢ·x − yᵢ)`: the
 * soft L1 loss of `scipy.optimize.least_squares`. Row `i` is the 0/1 signature row
 * `patterns[rowP[i]]`, scaled by `rowK[i]`.
 *
 * The loss is convex and smooth, so this takes projected Newton steps (Bertsekas): the variables
 * at 0 whose gradient pushes them below stay there, the others take a Newton step, and the step is
 * halved until the loss decreases. Where that fails (a singular Hessian, as when one lineage
 * explains nothing), it takes an iteratively-reweighted-least-squares step instead, which always
 * decreases the loss, if slowly. It starts where LolliPop's solver does, with all coefficients
 * equal.
 *
 * There are only a few dozen distinct patterns, so the sums are taken per pattern, which keeps a
 * step at a few operations per row.
 */
export function softL1Fit(
    patterns: readonly number[][],
    rowP: Int32Array,
    rowK: Float64Array,
    rowY: Float64Array,
    count: number,
    fScale: number,
): number[] {
    const n = patterns[0].length;
    const f2 = fScale * fScale;
    const fitted = new Float64Array(patterns.length);
    const gradientSums = new Float64Array(patterns.length);
    const curvatureSums = new Float64Array(patterns.length);
    const irlsSums = new Float64Array(patterns.length);
    const irlsYSums = new Float64Array(patterns.length);

    /** The loss at `x`, and (with `derivatives`) the per-pattern sums of the derivatives. */
    const evaluate = (x: readonly number[], derivatives: boolean): number => {
        patterns.forEach((pattern, p) => (fitted[p] = dot(pattern, x)));
        if (derivatives) {
            gradientSums.fill(0);
            curvatureSums.fill(0);
            irlsSums.fill(0);
            irlsYSums.fill(0);
        }
        let loss = 0;
        for (let i = 0; i < count; i++) {
            const p = rowP[i];
            const k = rowK[i];
            const residual = k * (fitted[p] - rowY[i]);
            const root = Math.sqrt(1 + (residual * residual) / f2);
            loss += f2 * (root - 1);
            if (derivatives) {
                gradientSums[p] += (k * residual) / root;
                curvatureSums[p] += (k * k) / (root * root * root);
                irlsSums[p] += (k * k) / root;
                irlsYSums[p] += ((k * k) / root) * rowY[i];
            }
        }
        return loss;
    };

    let x = new Array<number>(n).fill(1 / n);
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const loss = evaluate(x, true);
        const gradient = new Array<number>(n).fill(0);
        const hessian = Array.from({ length: n }, () => new Array<number>(n).fill(0));
        patterns.forEach((pattern, p) => {
            for (let j = 0; j < n; j++) {
                if (pattern[j] === 0) {
                    continue;
                }
                gradient[j] += gradientSums[p];
                for (let l = 0; l < n; l++) {
                    hessian[j][l] += curvatureSums[p] * pattern[l];
                }
            }
        });

        let next = newtonStep(x, gradient, hessian, loss, evaluate);
        next ??= nnls(normalMatrix(patterns, irlsSums), normalVector(patterns, irlsYSums));
        const change = Math.max(...next.map((value, j) => Math.abs(value - x[j]))) / Math.max(sum(next), 1e-300);
        x = next;
        if (change < TOLERANCE) {
            break;
        }
    }
    return x;
}

/** A projected Newton step that decreases the loss, or `undefined`. */
function newtonStep(
    x: readonly number[],
    gradient: readonly number[],
    hessian: readonly number[][],
    loss: number,
    evaluate: (x: readonly number[], derivatives: boolean) => number,
): number[] | undefined {
    const free = x.flatMap((value, j) => (value > 0 || gradient[j] < 0 ? [j] : []));
    if (free.length === 0) {
        return undefined;
    }
    const inverse = invert(free.map((j) => free.map((l) => hessian[j][l])));
    if (inverse === undefined) {
        return undefined;
    }
    const direction = new Array<number>(x.length).fill(0);
    free.forEach((j, row) => {
        direction[j] = -inverse[row].reduce((result, value, column) => result + value * gradient[free[column]], 0);
    });
    if (!direction.every(Number.isFinite)) {
        return undefined;
    }
    for (let step = 1; step > 1e-10; step /= 2) {
        const candidate = x.map((value, j) => Math.max(0, value + step * direction[j]));
        if (evaluate(candidate, false) < loss) {
            return candidate;
        }
    }
    return undefined;
}

/** `Σ_p weights[p] · d_p d_pᵀ` for the 0/1 patterns `d_p`. */
function normalMatrix(patterns: readonly number[][], weights: Float64Array): number[][] {
    const n = patterns[0].length;
    const result = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    patterns.forEach((pattern, p) => {
        for (let j = 0; j < n; j++) {
            for (let l = 0; l < n; l++) {
                result[j][l] += weights[p] * pattern[j] * pattern[l];
            }
        }
    });
    return result;
}

/** `Σ_p weights[p] · d_p` for the 0/1 patterns `d_p`. */
function normalVector(patterns: readonly number[][], weights: Float64Array): number[] {
    return patterns[0].map((_, j) => patterns.reduce((result, pattern, p) => result + weights[p] * pattern[j], 0));
}
