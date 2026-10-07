// SPDX-License-Identifier: GPL-3.0-or-later
// Derived from LolliPop (https://github.com/cbg-ethz/LolliPop); see lollipop/README.md.

/**
 * Kernel deconvolution of wastewater mutation frequencies into lineage prevalences: a port of
 * LolliPop (https://github.com/cbg-ethz/LolliPop), the tool behind the Swiss wastewater variant
 * curves, with the preset of the Swiss surveillance (`deconv_bootstrap_cowwid`).
 *
 * Each lineage of the panel is described by its signature, the mutations it carries. A sample's
 * frequency of a mutation is then the summed prevalence of the lineages that carry it, so the
 * prevalences are what a linear regression of the frequencies on the signatures finds:
 *
 * - Every informative mutation (carried by some lineages of the panel, not all) gives one row per
 *   sample: the 0/1 signature row and the frequency. It also gives a complement row — the
 *   reference base, `1 − frequency`, carried by the lineages without the mutation — and that
 *   complement is also carried by an extra `undetermined` lineage, which takes up whatever the
 *   panel doesn't explain.
 * - The estimate for a date is a robust (soft L1) non-negative regression over all samples, each
 *   weighted by a Gaussian kernel of its distance in days, renormalized to sum to 1. Wastewater
 *   samples are noisy, and the kernel borrows strength from the neighbouring ones; the soft L1
 *   loss keeps single wild frequencies (amplicon dropout, a few PCR copies) from pulling the fit.
 * - The uncertainty comes from a bootstrap over the mutations: the fit is repeated with mutations
 *   drawn with replacement (a mutation's row and its complement row together), and the estimate
 *   is the mean of the rounds, the confidence interval their quantiles. Which mutations happen to
 *   be in the signatures is the main source of uncertainty in wastewater data.
 *
 * LolliPop's quirks are kept, so that the results match it: the bandwidth is the kernel's
 * variance, not its standard deviation, and the rows are scaled by the kernel weight itself (not
 * its square root).
 *
 * The fit itself is in `softL1.ts`.
 */

import { sum } from './linearAlgebra';
import { softL1Fit } from './softL1';

/** The extra lineage that takes up what the panel doesn't explain. */
export const UNDETERMINED = 'undetermined';

export type DeconvolutionOptions = {
    /** The variance of the Gaussian kernel, in days². */
    bandwidth: number;
    /** Samples with a smaller kernel weight are left out of a date's fit. */
    minTol: number;
    /** The scale of the soft L1 loss: residuals well above it count linearly, not squared. */
    fScale: number;
    /** Rounds of the bootstrap. */
    bootstraps: number;
    /** Of the confidence intervals, like 0.95. */
    confidenceLevel: number;
};

/** LolliPop's `deconv_bootstrap_cowwid` preset, the one of the Swiss surveillance. */
export const DEFAULT_DECONVOLUTION_OPTIONS: DeconvolutionOptions = {
    bandwidth: 10,
    minTol: 1e-3,
    fScale: 0.01,
    bootstraps: 100,
    confidenceLevel: 0.95,
};

/** The frequency of one mutation in one sample. */
export type MutationFrequency = {
    /** ISO `yyyy-mm-dd`, the sampling date. */
    date: string;
    /** Like `C241T`. */
    mutation: string;
    /** Between 0 and 1. */
    frac: number;
};

/** How often each mutation was drawn in a round of the bootstrap. */
export type Resample = Record<string, number>;

export type DeconvolutionInput = {
    /** The mutations of each lineage of the panel, in the order of the panel. */
    signatures: Record<string, readonly string[]>;
    frequencies: readonly MutationFrequency[];
    options: DeconvolutionOptions;
    /**
     * The draws of the bootstrap rounds, instead of drawing them: for replaying LolliPop's in the
     * tests. Without it, the draws are random, but the same for the same input.
     */
    resamples?: readonly Resample[];
};

export type DeconvolutionEstimate = {
    /** The lineage, or `UNDETERMINED`. */
    variant: string;
    /** The mean over the bootstrap rounds. */
    proportion: number;
    /** The quantiles of the bootstrap rounds for the confidence level. */
    lower: number;
    upper: number;
};

export type DeconvolutionResult = {
    /** The lineages of the panel, then `UNDETERMINED`. */
    variants: string[];
    /** The mutations that tell the lineages of the panel apart. */
    informativeMutations: string[];
    /** Every sampling date, ascending, with one estimate per variant (in the order of `variants`). */
    dates: { date: string; estimates: DeconvolutionEstimate[] }[];
};

type Row = { design: number[]; y: number; day: number; mutation: string };

/** Fixed, so that the same input always gives the same intervals. */
const SEED = 1;

export function deconvolve({ signatures, frequencies, options, resamples }: DeconvolutionInput): DeconvolutionResult {
    const lineages = Object.keys(signatures);
    const variants = [...lineages, UNDETERMINED];
    const designByMutation = informativeDesign(signatures);

    const rows: Row[] = [];
    const dates = new Set<string>();
    for (const { date, mutation, frac } of frequencies) {
        const design = designByMutation.get(mutation);
        if (design === undefined || !Number.isFinite(frac)) {
            continue;
        }
        const day = toDay(date);
        dates.add(date);
        rows.push({ design: [...design, 0], y: frac, day, mutation });
        rows.push({ design: [...design.map((value) => 1 - value), 1], y: 1 - frac, day, mutation });
    }
    const sortedDates = [...dates].sort();
    const days = sortedDates.map(toDay);

    // LolliPop's `resample_mutations`: as many draws as there are mutations, with replacement.
    // Sorted, so that the draws don't depend on the order the frequencies come in.
    const mutations = [...new Set(rows.map((row) => row.mutation))].sort();
    const random = mulberry32(SEED);
    const rounds =
        resamples ??
        Array.from({ length: options.bootstraps }, () => {
            const counts: Resample = Object.fromEntries(mutations.map((mutation) => [mutation, 0]));
            for (const _ of mutations) {
                counts[mutations[Math.floor(random() * mutations.length)]]++;
            }
            return counts;
        });

    // Rows are aggregated by their design pattern in the fit (see `softL1Fit`).
    const patternIndex = new Map<string, number>();
    const patterns: number[][] = [];
    const rowPattern = rows.map((row) => {
        const key = row.design.join();
        if (!patternIndex.has(key)) {
            patternIndex.set(key, patterns.length);
            patterns.push(row.design);
        }
        return patternIndex.get(key)!;
    });

    // The rows near enough to each date to count in any round: a mutation drawn `maxDraws` times
    // weighs that many times its kernel weight.
    // (A loop, not `Math.max(...)`: rounds × mutations can be more arguments than a call takes.)
    let maxDraws = 1;
    for (const counts of rounds) {
        for (const draws of Object.values(counts)) {
            maxDraws = Math.max(maxDraws, draws);
        }
    }
    const nearRows = days.map((day) =>
        rows.flatMap((row, i) => {
            const kernel = Math.exp(-((day - row.day) ** 2) / 2 / options.bandwidth);
            return kernel * maxDraws >= options.minTol
                ? [{ kernel, y: row.y, pattern: rowPattern[i], mutation: row.mutation }]
                : [];
        }),
    );

    // fits[date][round][variant]
    const fits = days.map(() => [] as number[][]);
    const capacity = Math.max(0, ...nearRows.map((near) => near.length));
    const rowK = new Float64Array(capacity);
    const rowY = new Float64Array(capacity);
    const rowP = new Int32Array(capacity);
    for (const counts of rounds) {
        nearRows.forEach((near, i) => {
            let count = 0;
            for (const row of near) {
                const k = row.kernel * (counts[row.mutation] ?? 0);
                if (k >= options.minTol) {
                    rowK[count] = k;
                    rowY[count] = row.y;
                    rowP[count] = row.pattern;
                    count++;
                }
            }
            if (count === 0) {
                return;
            }
            const fitted = softL1Fit(patterns, rowP, rowK, rowY, count, options.fScale);
            const total = sum(fitted);
            if (total > 0) {
                fits[i].push(fitted.map((value) => value / total));
            }
        });
    }

    const lowerQuantile = (1 - options.confidenceLevel) / 2;
    return {
        variants,
        informativeMutations: [...designByMutation.keys()],
        dates: sortedDates.map((date, i) => ({
            date,
            estimates: variants.map((variant, j) => {
                const values = fits[i].map((fit) => fit[j]);
                return {
                    variant,
                    proportion: values.length === 0 ? NaN : sum(values) / values.length,
                    lower: quantile(values, lowerQuantile),
                    upper: quantile(values, 1 - lowerQuantile),
                };
            }),
        })),
    };
}

/** The mutations that tell the lineages of the panel apart: some lineages carry them, but not all. */
export function informativeMutations(signatures: Record<string, readonly string[]>): string[] {
    return [...informativeDesign(signatures).keys()];
}

/** The signature row of every mutation that some lineages of the panel carry, but not all. */
function informativeDesign(signatures: Record<string, readonly string[]>): Map<string, number[]> {
    const sets = Object.values(signatures).map((mutations) => new Set(mutations));
    const result = new Map<string, number[]>();
    for (const mutation of new Set(sets.flatMap((set) => [...set]))) {
        const design = sets.map((set): number => (set.has(mutation) ? 1 : 0));
        const carriers = design.reduce((sum, value) => sum + value, 0);
        if (carriers > 0 && carriers < sets.length) {
            result.set(mutation, design);
        }
    }
    return result;
}

/** Like `numpy.quantile`, interpolating linearly between the closest ranks. */
function quantile(values: readonly number[], q: number): number {
    if (values.length === 0) {
        return NaN;
    }
    const sorted = [...values].sort((first, second) => first - second);
    const position = (sorted.length - 1) * q;
    const below = Math.floor(position);
    const above = Math.min(below + 1, sorted.length - 1);
    return sorted[below] + (position - below) * (sorted[above] - sorted[below]);
}

/** A small seeded random number generator, uniform in [0, 1). */
function mulberry32(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function toDay(isoDate: string): number {
    return Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000;
}
