import { useState } from 'react';

import { getDefaultMeanProportion } from '../../pageState/wasap/defaultMeanProportion';
import { type WasapAnalysisFilter, type WasapMeanProportion } from '../../pageState/wasap/wasapAnalysisFilter';

/**
 * The filter of a mode as it is being edited, before it is applied.
 *
 * Until the user touches the mean proportion control it follows the default of the mode (which can
 * change with the manually entered mutations, say), so an explicit value is only kept once they have
 * changed it.
 */
export function useDraftFilter<Analysis extends WasapAnalysisFilter>(
    appliedAnalysis: Analysis,
    appliedMeanProportion: WasapMeanProportion,
) {
    const [analysis, setAnalysis] = useState(appliedAnalysis);
    const [meanProportionOverride, setMeanProportion] = useState<WasapMeanProportion | undefined>(
        isDefaultMeanProportion(appliedMeanProportion, appliedAnalysis) ? undefined : appliedMeanProportion,
    );

    return {
        analysis,
        setAnalysis,
        meanProportion: meanProportionOverride ?? getDefaultMeanProportion(analysis),
        setMeanProportion,
    };
}

function isDefaultMeanProportion(meanProportion: WasapMeanProportion, analysis: WasapAnalysisFilter): boolean {
    const defaults = getDefaultMeanProportion(analysis);
    return meanProportion.lower === defaults.lower && meanProportion.upper === defaults.upper;
}
