import { useId } from 'react';

import { LabeledField } from './LabeledField';

/**
 * A pick of one of a few short options, as a row of segments in one grey track: for a handful
 * of values, like thresholds or a choice of two, where separate buttons would take too much room.
 * The picked one is a white tile in the track. No segment is marked where `value` is none of the
 * options.
 */
export function SegmentedSelect<T extends string | number>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: T;
    /** `title`: what a label like a dash stands for, for screen readers and as a tooltip. */
    options: { value: T; label: string; title?: string }[];
    onChange: (value: T) => void;
}) {
    const id = useId();

    return (
        <LabeledField label={label}>
            <div className='flex h-8 gap-0.5 border border-gray-300 bg-stone-100 p-0.5 text-sm'>
                {options.map((option) => {
                    const isChecked = value === option.value;
                    return (
                        <label
                            key={String(option.value)}
                            title={option.title}
                            className={`has-focus-visible:outline-brand-700 flex flex-1 cursor-pointer items-center justify-center border has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 ${
                                isChecked
                                    ? 'border-gray-300 bg-white font-medium text-stone-900'
                                    : 'border-transparent text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                            <input
                                type='radio'
                                name={id}
                                className='sr-only'
                                aria-label={option.title}
                                checked={isChecked}
                                onChange={() => onChange(option.value)}
                            />
                            {option.label}
                        </label>
                    );
                })}
            </div>
        </LabeledField>
    );
}
