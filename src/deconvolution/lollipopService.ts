/**
 * The deconvolution, computed by the LolliPop service (`lollipop-service/`): the request and
 * response of its `POST /deconvolve`.
 */

import { z } from 'zod';

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

export type DeconvolutionInput = {
    /** The mutations of each lineage of the panel, in the order of the panel. */
    signatures: Record<string, readonly string[]>;
    frequencies: readonly MutationFrequency[];
    options: DeconvolutionOptions;
};

const deconvolutionResultSchema = z.object({
    /** The lineages of the panel, then `UNDETERMINED`. */
    variants: z.array(z.string()),
    /** Every sampling date with an estimate, ascending, with one estimate per variant (in the order of `variants`). */
    dates: z.array(
        z.object({
            date: z.string(),
            estimates: z.array(
                z.object({
                    variant: z.string(),
                    /** The mean over the bootstrap rounds. */
                    proportion: z.number(),
                    /** The quantiles of the bootstrap rounds for the confidence level. */
                    lower: z.number(),
                    upper: z.number(),
                }),
            ),
        }),
    ),
});

export type DeconvolutionResult = z.infer<typeof deconvolutionResultSchema>;

export async function fetchDeconvolution(
    serviceUrl: string,
    input: DeconvolutionInput,
    signal?: AbortSignal,
): Promise<DeconvolutionResult> {
    const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/deconvolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal,
    });
    if (!response.ok) {
        throw new Error(`the LolliPop service answered ${response.status} ${response.statusText}`);
    }
    return deconvolutionResultSchema.parse(await response.json());
}

/** The mutations that tell the lineages of the panel apart: some lineages carry them, but not all. */
export function informativeMutations(signatures: Record<string, readonly string[]>): string[] {
    const sets = Object.values(signatures).map((mutations) => new Set(mutations));
    return [...new Set(sets.flatMap((set) => [...set]))].filter((mutation) => {
        const carriers = sets.filter((set) => set.has(mutation)).length;
        return carriers > 0 && carriers < sets.length;
    });
}
