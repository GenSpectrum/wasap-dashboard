import { useEffect, useMemo } from 'react';

import { useWasapLayoutContext } from './WasapLayout';
import { useSiloReadFilter } from './useSiloReadFilter';
import { useWasapPageData } from './useWasapPageData';
import { getClientLogger } from '../../../clientLogger';
import type { WasapPageConfig } from '../../../config/wasapPageConfig';
import { type PageStateHandler } from '../../../pageState/PageStateHandler';
import { usePageState } from '../../../pageState/usePageState';
import { type WasapAnalysisFilter, type WasapModeFilter } from '../../../pageState/wasap/wasapAnalysisFilter';

const logger = getClientLogger('useModePage');

/**
 * What the page of an analysis mode needs: its state from the URL, and the data
 * for it (which mutations or queries to show, the filter to read them with).
 * `WasapLayout` has to be above.
 */
export function useModePage<Analysis extends WasapAnalysisFilter>(
    config: WasapPageConfig,
    pageStateHandler: PageStateHandler<WasapModeFilter<Analysis>>,
) {
    const { resistanceData, lineageTree } = useWasapLayoutContext();
    const { displayMutationsBySet } = resistanceData;

    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);

    // fetch which mutations should be analyzed
    const {
        data,
        isPending: isDataPending,
        isError,
        error,
    } = useWasapPageData(config, displayMutationsBySet, analysis, lineageTree);

    useEffect(() => {
        if (error) {
            logger.error(`Failed to fetch wasap page data: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [error]);

    // TODO: this does nothing on the resistance page, which has no mean proportion setting (it
    // always gets the full 0 to 1 here) and filters by its proportion range tabs instead. The mean
    // proportion should probably move out of the base filter into the page state handlers of the
    // modes that have it.
    const meanProportionInterval = useMemo(
        () => ({ min: base.meanProportion.lower, max: base.meanProportion.upper }),
        [base.meanProportion.lower, base.meanProportion.upper],
    );

    const { filter, isPending: isFilterPending } = useSiloReadFilter(base.locationName);

    return {
        config,
        pageStateHandler,
        base,
        analysis,
        setPageState,
        data,
        isError,
        isPending: isDataPending || isFilterPending,
        filter,
        meanProportionInterval,
        resistanceSetNames: Object.keys(displayMutationsBySet),
    };
}
