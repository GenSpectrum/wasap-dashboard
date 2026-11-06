import { useId } from 'react';

import { LabeledField } from './LabeledField';

/**
 * A pick of one of a few options, as segments in one grey track: side by side for a handful of
 * short values, like thresholds or a choice of two, or stacked for lists that may grow or have
 * long labels. The picked one is a white tile in the track. No segment is marked where `value`
 * is none of the options.
 */
export function SegmentedSelect<T extends string | number>({
    label,
    value,
    options,
    onChange,
    direction = 'horizontal',
}: {
    label: string;
    value: T;
    /** `title`: what a label like a dash stands for, for screen readers and as a tooltip. */
    options: { value: T; label: string; title?: string }[];
    onChange: (value: T) => void;
    direction?: 'horizontal' | 'vertical';
}) {
    const id = useId();
    const labelId = useId();
    const isVertical = direction === 'vertical';

    return (
        <LabeledField label={label} labelId={labelId}>
            <div
                role='radiogroup'
                aria-labelledby={labelId}
                className={`flex gap-0.5 border border-gray-300 bg-stone-100 p-0.5 text-sm ${isVertical ? 'flex-col' : 'h-8'}`}
            >
                {options.map((option) => {
                    const isChecked = value === option.value;
                    return (
                        <label
                            key={String(option.value)}
                            title={option.title}
                            className={`has-focus-visible:outline-brand-700 flex flex-1 cursor-pointer items-center border ${
                                isVertical ? 'min-h-7 px-2.5 py-1' : 'justify-center'
                            } has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 ${
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
