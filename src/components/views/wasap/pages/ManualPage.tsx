import { useMemo } from 'react';

import { type WasapPageConfigFor } from '../../../../config/wasapPageConfig';
import { usePageState } from '../../../../pageState/usePageState';
import { ManualPageStateHandler } from '../../../../pageState/wasap/handlers/ManualPageStateHandler';
import { MutationsResult } from '../../../dataDisplay/MutationsResult';
import { WasapResults } from '../../../dataDisplay/WasapResults';
import { FilterSidebar } from '../../../filterSidebar/FilterSidebar';
import { ManualAnalysisFilter } from '../../../filterSidebar/filters/ManualAnalysisFilter';
import { ModePageLayout } from '../ModePageLayout';
import { useWasapLayoutContext } from '../WasapLayout';
import { useSiloReadFilter } from '../useSiloReadFilter';
import { useWasapPageData } from '../useWasapPageData';

export function ManualPage({ config }: { config: WasapPageConfigFor<'manual'> }) {
    const pageStateHandler = useMemo(() => new ManualPageStateHandler(config), [config]);
    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { resistanceData, lineageTree } = useWasapLayoutContext();
    const { filter, isPending: isFilterPending } = useSiloReadFilter(base.locationName);
    const { data, isPending, isError } = useWasapPageData(
        config,
        resistanceData.displayMutationsBySet,
        analysis,
        lineageTree,
    );
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
            <WasapResults data={data} isError={isError} isPending={isPending || isFilterPending}>
                {(data) => (
                    <MutationsResult
                        data={data}
                        analysis={analysis}
                        filter={filter}
                        granularity={base.granularity}
                        sequenceType={analysis.sequenceType}
                        meanProportionInterval={meanProportionInterval}
                    />
                )}
            </WasapResults>
        </ModePageLayout>
    );
}
