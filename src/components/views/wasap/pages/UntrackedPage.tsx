import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { type WasapPageConfigFor } from '../../../../config/wasapPageConfig';
import { getCladeLineages } from '../../../../externalData/lapis/getCladeLineages';
import { usePageState } from '../../../../pageState/usePageState';
import { UntrackedPageStateHandler } from '../../../../pageState/wasap/handlers/UntrackedPageStateHandler';
import { MutationsResult } from '../../../dataDisplay/MutationsResult';
import { WasapResults } from '../../../dataDisplay/WasapResults';
import { FilterSidebar } from '../../../filterSidebar/FilterSidebar';
import { UntrackedFilter } from '../../../filterSidebar/filters/UntrackedFilter';
import { ModePageLayout } from '../ModePageLayout';
import { useWasapLayoutContext } from '../WasapLayout';
import { useSiloReadFilter } from '../useSiloReadFilter';
import { useWasapPageData } from '../useWasapPageData';

export function UntrackedPage({ config }: { config: WasapPageConfigFor<'untracked'> }) {
    const pageStateHandler = useMemo(() => new UntrackedPageStateHandler(config), [config]);
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

    const { lapisBaseUrl, cladeField, lineageField } = config.clinicalLapis;
    // Keyed on the clinical-LAPIS coordinates the query actually targets, not just 'cladeLineages'.
    const cladeLineageQueryResult = useQuery({
        queryKey: ['cladeLineages', true, lapisBaseUrl, cladeField, lineageField],
        queryFn: () => getCladeLineages(lapisBaseUrl, cladeField, lineageField, true),
    });

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
                        <UntrackedFilter
                            pageState={analysis}
                            setPageState={setAnalysis}
                            clinicalSequenceLapisBaseUrl={lapisBaseUrl}
                            clinicalSequenceLapisLineageField={lineageField}
                            cladeLineageQueryResult={cladeLineageQueryResult}
                        />
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
