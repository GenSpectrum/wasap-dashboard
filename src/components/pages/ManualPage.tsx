import { useMemo } from 'react';

import { ModePageLayout } from './ModePageLayout';
import { type WasapPageConfigFor } from '../../config/wasapPageConfig';
import { usePageState } from '../../pageState/usePageState';
import { ManualPageStateHandler } from '../../pageState/wasap/handlers/ManualPageStateHandler';
import { useSiloReadFilter } from '../../pageState/wasap/useSiloReadFilter';
import { Loading } from '../../util/Loading';
import { MutationsResult } from '../dataDisplay/MutationsResult';
import { FilterSidebar } from '../filterSidebar/FilterSidebar';
import { ManualAnalysisFilter } from '../filterSidebar/filters/ManualAnalysisFilter';

export function ManualPage({ config }: { config: WasapPageConfigFor<'manual'> }) {
    const pageStateHandler = useMemo(() => new ManualPageStateHandler(config), [config]);
    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { filter, isPending: isFilterPending } = useSiloReadFilter(base.locationName);
    const meanProportionInterval = useMemo(
        () => ({ min: base.meanProportion.lower, max: base.meanProportion.upper }),
        [base.meanProportion.lower, base.meanProportion.upper],
    );

    return (
        <ModePageLayout
            sidebar={
                <FilterSidebar
                    pageStateHandler={pageStateHandler}
                    base={base}
                    analysis={analysis}
                    setPageState={setPageState}
                >
                    {(analysis, setAnalysis) => (
                        <ManualAnalysisFilter pageState={analysis} setPageState={setAnalysis} />
                    )}
                </FilterSidebar>
            }
        >
            {isFilterPending ? (
                <Loading />
            ) : (
                <MutationsResult
                    displayMutations={analysis.mutations}
                    analysis={analysis}
                    filter={filter}
                    granularity={base.granularity}
                    sequenceType={analysis.sequenceType}
                    meanProportionInterval={meanProportionInterval}
                />
            )}
        </ModePageLayout>
    );
}
