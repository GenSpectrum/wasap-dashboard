import { useId } from 'react';

import { LabeledField } from './LabeledField';
import { HoverTooltip } from '../ui/HoverTooltip';

/**
 * A pick of one of a few options, as segments in one grey track: side by side for a handful of
 * short values, like thresholds or a choice of two, or stacked for lists that may grow or have
 * long labels. The picked one is a white tile in the track. No segment is marked where `value`
 * is none of the options.
 *
 * With an `icon`, the icon at the start of the track stands for the label, which is then only its tooltip and
 * the group's name for screen readers: for a row of controls under one heading, where labels would take a line.
 */
export function SegmentedSelect<T extends string | number>({
    label,
    value,
    options,
    onChange,
    direction = 'horizontal',
    icon,
    embedded = false,
}: {
    label: string;
    value: T;
    /** `title`: what a label like a dash stands for, for screen readers and as a tooltip. */
    options: { value: T; label: string; title?: string }[];
    onChange: (value: T) => void;
    direction?: 'horizontal' | 'vertical';
    /** An iconify class, e.g. `mdi--chart-bar`. */
    icon?: string;
    /** Fills its container and has no border of its own: for a cell of a bar, whose borders are its edges. */
    embedded?: boolean;
}) {
    const id = useId();
    const labelId = useId();
    const isVertical = direction === 'vertical';

    // A radio group, named by its label: the visible one, or the icon's while that stands in for it.
    const track = (
        <div
            role='radiogroup'
            aria-label={icon !== undefined ? label : undefined}
            aria-labelledby={icon !== undefined ? undefined : labelId}
            className={`flex gap-0.5 bg-stone-100 p-0.5 text-sm ${embedded ? 'h-full' : 'border border-gray-300'} ${
                isVertical ? 'flex-col' : embedded ? '' : 'h-8'
            }`}
        >
            {icon !== undefined && (
                <HoverTooltip
                    content={<span className='text-sm text-gray-700'>{label}</span>}
                    className='mx-1.5 flex shrink-0 self-center'
                >
                    <span aria-hidden className={`iconify text-base text-gray-500 ${icon}`} />
                </HoverTooltip>
            )}
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
    );

    return icon !== undefined ? (
        track
    ) : (
        <LabeledField label={label} labelId={labelId}>
            {track}
        </LabeledField>
    );
}
