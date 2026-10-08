import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ModePageLayout } from './ModePageLayout';
import { type WasapPageConfigFor } from '../../config/wasapPageConfig';
import { getCladeLineages } from '../../externalData/lapis/getCladeLineages';
import { useUntrackedMutations } from '../../externalData/lapis/useUntrackedMutations';
import { usePageState } from '../../pageState/usePageState';
import { UntrackedPageStateHandler } from '../../pageState/wasap/handlers/UntrackedPageStateHandler';
import { useSiloReadFilter } from '../../pageState/wasap/useSiloReadFilter';
import { MutationsResult } from '../dataDisplay/MutationsResult';
import { WasapResults } from '../dataDisplay/WasapResults';
import { FilterSidebar } from '../filterSidebar/FilterSidebar';
import { UntrackedFilter } from '../filterSidebar/filters/UntrackedFilter';

export function UntrackedPage({ config }: { config: WasapPageConfigFor<'untracked'> }) {
    const pageStateHandler = useMemo(() => new UntrackedPageStateHandler(config), [config]);
    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { filter, isPending: isFilterPending } = useSiloReadFilter(base.locationName);
    const { data, isPending, error } = useUntrackedMutations(config, analysis);
    const meanProportionInterval = useMemo(
        () => ({ min: base.meanProportion.lower, max: base.meanProportion.upper }),
        [base.meanProportion.lower, base.meanProportion.upper],
    );

    const { lapisBaseUrl, cladeField, lineageField } = config.clinicalLapis;
    // Keyed on the clinical-LAPIS coordinates the query actually targets, not just 'cladeLineages'.
    const cladeLineageQueryResult = useQuery({
        queryKey: ['cladeLineages', true, lapisBaseUrl, cladeField, lineageField],
        queryFn: ({ signal }) => getCladeLineages(lapisBaseUrl, cladeField, lineageField, true, signal),
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
            <WasapResults data={data} error={error} isPending={isPending || isFilterPending}>
                {(displayMutations) => (
                    <MutationsResult
                        displayMutations={displayMutations}
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
