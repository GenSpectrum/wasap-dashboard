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
        <>
            {displayMutations?.length !== 0 && (
                <ProportionRangeTabs
                    value={page.analysis.proportionRange}
                    counts={counts}
                    onChange={onProportionRangeChange}
                />
            )}
            <MutationsResult page={{ ...page, meanProportionInterval }} data={data} sequenceType={sequenceType} />
        </>
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
        <div>
            <div className='mb-2 text-sm text-gray-600'>Mutations by mean proportion</div>
            <div className='flex flex-wrap gap-2' role='group' aria-label='Mutations by mean proportion'>
                {RESISTANCE_PROPORTION_RANGES.map(({ range, label }) => {
                    const isSelected = range === value;
                    return (
                        <button
                            key={range}
                            type='button'
                            aria-pressed={isSelected}
                            onClick={() => onChange(range)}
                            className={`flex min-w-32 cursor-pointer flex-col items-start border bg-white px-4 py-2 text-left ${
                                isSelected ? 'border-primary' : 'border-gray-300 hover:border-gray-400'
                            }`}
                        >
                            <span className='text-sm text-gray-600'>{label}</span>
                            <span className='text-2xl font-semibold'>{counts?.[range] ?? '…'}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
