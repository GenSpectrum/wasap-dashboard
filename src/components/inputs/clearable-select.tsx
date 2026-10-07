import { type ChangeEvent } from 'react';

import { DeleteIcon } from '../shared/icons/DeleteIcon';

const NOTHING_SELECTED = '__undefined__';

export type ClearableSelectProps = {
    items: string[];
    /** `null` when nothing is selected: the placeholder shows. */
    value: string | null;
    onChange?: (item: string | null) => void;
    placeholderText?: string;
    className?: string;
};

export function ClearableSelect({ items, value, onChange, placeholderText, className }: ClearableSelectProps) {
    return (
        <div className={`relative block min-w-24 ${className}`}>
            <select
                className='select w-full pr-14'
                value={value ?? NOTHING_SELECTED}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange?.(event.currentTarget.value)}
            >
                <option value={NOTHING_SELECTED} disabled>
                    {placeholderText ?? 'Select an option'}
                </option>
                {items.map((item) => (
                    <option key={item} value={item}>
                        {item}
                    </option>
                ))}
            </select>
            {value !== null && (
                <button
                    type='button'
                    aria-label='Clear'
                    onClick={() => onChange?.(null)}
                    className='absolute top-1/2 right-10 -translate-y-1/2 cursor-pointer border-0 bg-transparent'
                >
                    <DeleteIcon />
                </button>
            )}
        </div>
    );
}
