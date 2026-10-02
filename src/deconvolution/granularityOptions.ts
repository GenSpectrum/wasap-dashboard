import { DEFAULT_DECONVOLUTION_OPTIONS, type DeconvolutionOptions } from '../../lollipop';
import { type TemporalGranularity } from '../types/dashboardComponents';

/** By week (or month, …), how much the neighbouring week counts in a week's estimate. */
const NEIGHBOUR_WEIGHT = 0.6;

const SPACING_IN_DAYS = { week: 7, month: 30, year: 365 } as const;

/**
 * The deconvolution options for a granularity. By day, LolliPop's preset, whose kernel (a standard
 * deviation of about 3 days) smooths over the samples of about a week.
 *
 * Coarser, the samples are pooled per week (`poolFrequencies`) and the preset's kernel would leave
 * every week to itself: the neighbouring weeks would count only about 9 %. So the bandwidth grows
 * with the spacing of the points, until a neighbour counts `NEIGHBOUR_WEIGHT`: the kernel is
 * `exp(−d² / 2·bandwidth)`, so `bandwidth = spacing² / (2·ln(1 / NEIGHBOUR_WEIGHT))`, about 48 days²
 * by week.
 */
export function deconvolutionOptions(granularity: TemporalGranularity): DeconvolutionOptions {
    if (granularity === 'day') {
        return DEFAULT_DECONVOLUTION_OPTIONS;
    }
    const spacing = SPACING_IN_DAYS[granularity];
    return { ...DEFAULT_DECONVOLUTION_OPTIONS, bandwidth: spacing ** 2 / (2 * Math.log(1 / NEIGHBOUR_WEIGHT)) };
}
