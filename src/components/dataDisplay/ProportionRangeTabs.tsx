import { RESISTANCE_PROPORTION_RANGES } from './resistanceProportionRanges';
import { type ResistanceProportionRange } from '../../pageState/wasap/wasapAnalysisFilter';

/**
 * A tab per range of the mean proportion, with how many mutations are in it, attached to
 * the top of the mutations over time below.
 */
export function ProportionRangeTabs({
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
            {RESISTANCE_PROPORTION_RANGES.map(({ range, label, suffix }) => {
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
                        {/* The space keeps screen readers from running the label and the count together. */}
                        <span className='text-xs sm:text-sm'>
                            <span className='font-semibold'>{label}</span>
                            {suffix !== undefined && ` ${suffix}`}
                        </span>{' '}
                        <span className={`text-2xl font-semibold ${isSelected ? '' : 'text-gray-600'}`}>
                            {counts?.[range] ?? '…'}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
