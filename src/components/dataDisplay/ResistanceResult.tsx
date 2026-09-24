import { useMemo } from 'react';

import { MutationsResult } from './MutationsResult';
import { genesOf, useOverTimeMetadata } from '../../dataLayer/hooks/mutationsOverTime';
import { type SiloReadFilter } from '../../dataLayer/queries';
import {
    type ResistanceProportionRange,
    type WasapBaseFilter,
    type WasapResistanceFilter,
} from '../../pageState/wasap/wasapAnalysisFilter';
import {
    countByProportionRange,
    getProportionInterval,
    RESISTANCE_PROPORTION_RANGES,
} from '../views/wasap/resistanceProportionRanges';
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

function ProportionRangeTabs({
    value,
    counts,
    onChange,
}: {
    value: ResistanceProportionRange;
    /** `undefined` while they are loading. */
    counts: Record<ResistanceProportionRange, number> | undefined;
    onChange: (proportionRange: ResistanceProportionRange) => void;
}) {
    return (
        <div className='flex gap-1' role='group' aria-label='Mutations by mean proportion'>
            {RESISTANCE_PROPORTION_RANGES.map(({ range, label }) => {
                const isSelected = range === value;
                return (
                    <button
                        key={range}
                        type='button'
                        aria-pressed={isSelected}
                        onClick={() => onChange(range)}
                        // The tabs overlap the top border of the box below by a pixel: the selected
                        // one covers it (white bottom border, above the box), so it merges with the box.
                        className={`relative -mb-px flex min-w-0 flex-1 cursor-pointer flex-col items-start justify-between border border-stone-300 px-2 py-2 text-left sm:px-4 ${
                            isSelected
                                ? 'border-t-primary z-10 border-t-2 border-b-white bg-white'
                                : 'bg-stone-100 text-gray-500 hover:bg-stone-50'
                        }`}
                    >
                        <span className='text-xs sm:text-sm'>{label}</span>
                        <span className={`text-2xl font-semibold ${isSelected ? '' : 'text-gray-600'}`}>
                            {counts?.[range] ?? '…'}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
