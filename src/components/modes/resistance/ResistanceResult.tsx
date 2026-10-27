import { useMemo } from 'react';

import { ProportionRangeTabs } from './ProportionRangeTabs';
import { countByProportionRange, getProportionInterval } from './resistanceProportionRanges';
import { useOverTimeMetadata } from '../../../dataLayer/hooks/analyses/mutationsOverTime';
import { type RhydbReadFilter } from '../../../dataLayer/queries';
import {
    type ResistanceProportionRange,
    type WasapResistanceFilter,
} from '../../../pageState/wasap/wasapAnalysisFilter';
import { type TemporalGranularity } from '../../../util/temporalClass';
import { MutationsResult } from '../../mutations/MutationsResult';

/**
 * The mutations of a resistance set over time, with tabs above to only show those in a range
 * of the mean proportion. Every tab says how many mutations of the set are in its range.
 */
export function ResistanceResult({
    displayMutations,
    analysis,
    filter,
    granularity,
    onProportionRangeChange,
}: {
    displayMutations: string[];
    analysis: WasapResistanceFilter;
    filter: RhydbReadFilter;
    granularity: TemporalGranularity;
    onProportionRangeChange: (proportionRange: ResistanceProportionRange) => void;
}) {
    const sequenceType = analysis.sequenceType;
    // The same query as the one of the mutations over time below, so it is only fetched once.
    const { data: metadata } = useOverTimeMetadata(filter, granularity, sequenceType, displayMutations);
    const counts = useMemo(
        () =>
            metadata === undefined
                ? undefined
                : countByProportionRange(metadata.overallMutations.map((entry) => entry.proportion)),
        [metadata],
    );

    const meanProportionInterval = getProportionInterval(analysis.proportionRange);

    return (
        // One block, so the tabs sit right on top of the mutations over time, without the gap
        // that the results have between them otherwise.
        <div>
            {displayMutations.length !== 0 && (
                <ProportionRangeTabs
                    value={analysis.proportionRange}
                    counts={counts}
                    onChange={onProportionRangeChange}
                />
            )}
            <MutationsResult
                displayMutations={displayMutations}
                analysis={analysis}
                filter={filter}
                granularity={granularity}
                sequenceType={sequenceType}
                meanProportionInterval={meanProportionInterval}
            />
        </div>
    );
}
