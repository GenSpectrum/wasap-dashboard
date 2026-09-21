import type { WasapAnalysisFilter, WasapMeanProportion } from './wasapAnalysisFilter';

/**
 * The mean-proportion interval that is used when the user hasn't chosen one,
 * which depends on the analysis mode: some modes list lots of mutations that
 * are either (nearly) always or (nearly) never present, which isn't interesting.
 */
export function getDefaultMeanProportion(analysis: WasapAnalysisFilter): WasapMeanProportion {
    if (analysis.mode === 'resistance') {
        return { lower: 0.05, upper: 1.0 };
    }
    if (analysis.mode === 'manual' && analysis.mutations === undefined) {
        return { lower: 0.05, upper: 0.95 };
    }
    return { lower: 0.0, upper: 1.0 };
}
