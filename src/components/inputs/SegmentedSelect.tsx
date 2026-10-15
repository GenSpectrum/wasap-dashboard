import { useId } from 'react';

import { LabeledField } from './LabeledField';

/**
 * A pick of one of a few short options, as a row of connected segments: for a handful of values
 * on a scale, like thresholds, where separate buttons (`RadioSelect`) would take too much room.
 * The picked one has a coloured border, like in `RadioSelect`. No segment is marked where `value`
 * is none of the options.
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
            {/* `isolate`: the picked segment's z-index stays inside, under dropdowns opening over it. */}
            <div className='isolate flex text-sm'>
                {options.map((option, index) => {
                    const isChecked = value === option.value;
                    return (
                        // The segments overlap by their borders, the picked one on top, so its border shows all around.
                        <label
                            key={String(option.value)}
                            title={option.title}
                            className={`has-focus-visible:outline-brand-700 flex-1 cursor-pointer border bg-white py-1.5 text-center has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 ${
                                index > 0 ? '-ml-px' : ''
                            } ${isChecked ? 'border-primary relative z-10' : 'border-gray-300 hover:bg-stone-100'}`}
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
