import { useEffect, useMemo } from 'react';

import { useWasapLayoutContext } from './WasapLayout';
import { useWasapPageData } from './useWasapPageData';
import { getClientLogger } from '../../../clientLogger';
import type { WasapPageConfig } from '../../../config/wasapPageConfig';
import { type SiloReadFilter } from '../../../dataLayer/queries';
import { type PageStateHandler } from '../../../pageState/PageStateHandler';
import { usePageState } from '../../../pageState/usePageState';
import { type WasapAnalysisFilter, type WasapModeFilter } from '../../../pageState/wasap/wasapAnalysisFilter';

const logger = getClientLogger('WasapPage');

/**
 * What the page of an analysis mode needs: its state from the URL, and the data
 * for it (which mutations or queries to show, the filter to read them with).
 * `WasapLayout` has to be above.
 */
export function useModePage<Analysis extends WasapAnalysisFilter>(
    config: WasapPageConfig,
    pageStateHandler: PageStateHandler<WasapModeFilter<Analysis>>,
) {
    const { resistanceData, samplingDate, isSamplingDatePending } = useWasapLayoutContext();
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
    } = useWasapPageData(config, displayMutationsBySet, analysis);

    useEffect(() => {
        if (error) {
            logger.error(`Failed to fetch wasap page data: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [error]);

    const meanProportionInterval = useMemo(
        () => ({ min: base.meanProportion.lower, max: base.meanProportion.upper }),
        [base.meanProportion.lower, base.meanProportion.upper],
    );

    const filter: SiloReadFilter = {
        ...(base.locationName && { locationName: base.locationName }),
        ...(samplingDate.dateFrom && { samplingDateFrom: samplingDate.dateFrom }),
        ...(samplingDate.dateTo && { samplingDateTo: samplingDate.dateTo }),
    };

    return {
        config,
        pageStateHandler,
        base,
        analysis,
        setPageState,
        data,
        isError,
        isPending: isDataPending || isSamplingDatePending,
        filter,
        meanProportionInterval,
        resistanceSetNames: Object.keys(displayMutationsBySet),
    };
}
