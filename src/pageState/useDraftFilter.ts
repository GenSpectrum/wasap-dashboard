import { useState } from 'react';

import { type AnalysisFilter, type MeanProportion } from './analysisFilter';
import { getDefaultMeanProportion } from './defaultMeanProportion';

/**
 * The filter of a mode as it is being edited, before it is applied.
 *
 * Until the user touches the mean proportion control it follows the default of the mode (which can
 * change with the manually entered mutations, say), so an explicit value is only kept once they have
 * changed it.
 */
export function useDraftFilter<Analysis extends AnalysisFilter>(
    appliedAnalysis: Analysis,
    appliedMeanProportion: MeanProportion,
) {
    const [analysis, setAnalysis] = useState(appliedAnalysis);
    const [meanProportionOverride, setMeanProportion] = useState<MeanProportion | undefined>(
        isDefaultMeanProportion(appliedMeanProportion, appliedAnalysis) ? undefined : appliedMeanProportion,
    );

    return {
        analysis,
        setAnalysis,
        meanProportion: meanProportionOverride ?? getDefaultMeanProportion(analysis),
        setMeanProportion,
    };
}

function isDefaultMeanProportion(meanProportion: MeanProportion, analysis: AnalysisFilter): boolean {
    const defaults = getDefaultMeanProportion(analysis);
    return meanProportion.lower === defaults.lower && meanProportion.upper === defaults.upper;
}
