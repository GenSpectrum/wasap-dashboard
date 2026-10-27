import { useMemo } from 'react';

import { ManualAnalysisFilter } from './ManualAnalysisFilter';
import { type OrganismConfigFor } from '../../../config/organismConfig';
import { usePositionRangeMutations } from '../../../dataLayer/hooks/analyses/mutationsOverTime';
import { type RhydbReadFilter } from '../../../dataLayer/queries';
import { usePageState } from '../../../pageState/usePageState';
import { ManualPageStateHandler } from '../../../pageState/wasap/handlers/ManualPageStateHandler';
import { usePositionRange } from '../../../pageState/wasap/positionRange';
import { useRhydbReadFilter } from '../../../pageState/wasap/useRhydbReadFilter';
import {
    effectiveMutationSource,
    MUTATION_SOURCE,
    type WasapManualFilter,
} from '../../../pageState/wasap/wasapAnalysisFilter';
import { type TemporalGranularity } from '../../../util/temporal';
import { FilterSidebar } from '../../filterSidebar/FilterSidebar';
import { ModePageLayout } from '../../layout/ModePageLayout';
import { ModeResults } from '../../layout/ModeResults';
import { NothingSelected } from '../../layout/NothingSelected';
import { MutationsResult } from '../../mutations/MutationsResult';
import { type ProportionInterval } from '../../overTime/mutationsOverTime/getFilteredMutationCodes';
import { LoadingDisplay } from '../../ui/LoadingDisplay';

export function ManualPage({ config }: { config: OrganismConfigFor<'manual'> }) {
    const pageStateHandler = useMemo(() => new ManualPageStateHandler(config), [config]);
    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { filter, isPending: isFilterPending } = useRhydbReadFilter(base.locationNames);
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
                <LoadingDisplay />
            ) : (
                <ManualResult
                    analysis={analysis}
                    filter={filter}
                    granularity={base.granularity}
                    meanProportionInterval={meanProportionInterval}
                />
            )}
        </ModePageLayout>
    );
}

function ManualResult({
    analysis,
    filter,
    granularity,
    meanProportionInterval,
}: {
    analysis: WasapManualFilter;
    filter: RhydbReadFilter;
    granularity: TemporalGranularity;
    meanProportionInterval: ProportionInterval;
}) {
    const isRange = effectiveMutationSource(analysis) === MUTATION_SOURCE.range;
    const { referenceGenome, range } = usePositionRange(analysis);
    const rangeMutations = usePositionRangeMutations(filter, analysis.sequenceType, isRange ? range : undefined);

    const result = (displayMutations: string[] | undefined) => (
        <MutationsResult
            displayMutations={displayMutations}
            analysis={analysis}
            filter={filter}
            granularity={granularity}
            sequenceType={analysis.sequenceType}
            meanProportionInterval={meanProportionInterval}
        />
    );

    if (!isRange) {
        return result(analysis.mutations);
    }
    if (referenceGenome.data !== undefined && range === undefined) {
        return (
            <NothingSelected title='No positions selected'>
                The reference genome has no sequence to pick positions in.
            </NothingSelected>
        );
    }
    return (
        <ModeResults
            data={rangeMutations.data}
            error={referenceGenome.error ?? rangeMutations.error}
            isPending={referenceGenome.isPending || rangeMutations.isPending}
        >
            {result}
        </ModeResults>
    );
}
