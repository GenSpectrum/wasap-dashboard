import { useMemo } from 'react';

import { MutationsResult } from './MutationsResult';
import { ProportionRangeTabs } from './ProportionRangeTabs';
import { countByProportionRange, getProportionInterval } from './resistanceProportionRanges';
import { genesOf, useOverTimeMetadata } from '../../dataLayer/hooks/mutationsOverTime';
import { type SiloReadFilter } from '../../dataLayer/queries';
import { type ResistanceProportionRange, type WasapResistanceFilter } from '../../pageState/wasap/wasapAnalysisFilter';
import { type TemporalGranularity } from '../../types/dashboardComponents';
import { type WasapPageData } from '../views/wasap/useWasapPageData';

/**
 * The mutations of a resistance set over time, with tabs above to only show those in a range
 * of the mean proportion. Every tab says how many mutations of the set are in its range.
 */
export function ResistanceResult({
    data,
    analysis,
    filter,
    granularity,
    onProportionRangeChange,
}: {
    data: WasapPageData;
    analysis: WasapResistanceFilter;
    filter: SiloReadFilter;
    granularity: TemporalGranularity;
    onProportionRangeChange: (proportionRange: ResistanceProportionRange) => void;
}) {
    if (data.type !== 'mutations') {
        throw Error(`Expected mutations, but the data is of type '${data.type}'.`);
    }

    const { displayMutations } = data;
    const sequenceType = analysis.sequenceType;
    const sequenceNames = useMemo(() => genesOf(displayMutations, sequenceType), [displayMutations, sequenceType]);

    // The same query as the one of the mutations over time below, so it is only fetched once.
    const { data: metadata } = useOverTimeMetadata(filter, granularity, sequenceType, sequenceNames, displayMutations);
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
            {displayMutations?.length !== 0 && (
                <ProportionRangeTabs
                    value={analysis.proportionRange}
                    counts={counts}
                    onChange={onProportionRangeChange}
                />
            )}
            <MutationsResult
                data={data}
                analysis={analysis}
                filter={filter}
                granularity={granularity}
                sequenceType={sequenceType}
                meanProportionInterval={meanProportionInterval}
            />
        </div>
    );
}
