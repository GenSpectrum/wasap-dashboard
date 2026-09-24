import { useMemo } from 'react';

import { MutationsResult } from './MutationsResult';
import { ProportionRangeTabs } from './ProportionRangeTabs';
import { countByProportionRange, getProportionInterval } from './resistanceProportionRanges';
import { genesOf, useOverTimeMetadata } from '../../dataLayer/hooks/mutationsOverTime';
import { type SiloReadFilter } from '../../dataLayer/queries';
import {
    type ResistanceProportionRange,
    type WasapBaseFilter,
    type WasapResistanceFilter,
} from '../../pageState/wasap/wasapAnalysisFilter';
import { type WasapPageData } from '../views/wasap/useWasapPageData';

/**
 * The mutations of a resistance set over time, with tabs above to only show those in a range
 * of the mean proportion. Every tab says how many mutations of the set are in its range.
 */
export function ResistanceResult({
    page,
    data,
    onProportionRangeChange,
}: {
    page: {
        base: WasapBaseFilter;
        analysis: WasapResistanceFilter;
        filter: SiloReadFilter;
    };
    data: WasapPageData;
    onProportionRangeChange: (proportionRange: ResistanceProportionRange) => void;
}) {
    if (data.type !== 'mutations') {
        throw Error(`Expected mutations, but the data is of type '${data.type}'.`);
    }

    const { displayMutations } = data;
    const sequenceType = page.analysis.sequenceType;
    const sequenceNames = useMemo(() => genesOf(displayMutations, sequenceType), [displayMutations, sequenceType]);

    // The same query as the one of the mutations over time below, so it is only fetched once.
    const { data: metadata } = useOverTimeMetadata(
        page.filter,
        page.base.granularity,
        sequenceType,
        sequenceNames,
        displayMutations,
    );
    const counts = useMemo(
        () =>
            metadata === undefined
                ? undefined
                : countByProportionRange(metadata.overallMutations.map((entry) => entry.proportion)),
        [metadata],
    );

    const meanProportionInterval = getProportionInterval(page.analysis.proportionRange);

    return (
        // One block, so the tabs sit right on top of the mutations over time, without the gap
        // that the results have between them otherwise.
        <div>
            {displayMutations?.length !== 0 && (
                <ProportionRangeTabs
                    value={page.analysis.proportionRange}
                    counts={counts}
                    onChange={onProportionRangeChange}
                />
            )}
            <MutationsResult page={{ ...page, meanProportionInterval }} data={data} sequenceType={sequenceType} />
        </div>
    );
}
