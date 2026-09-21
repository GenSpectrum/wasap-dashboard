import { type ChangeEvent, useEffect, useState } from 'react';

import { DeleteIcon } from '../shared/icons/DeleteIcon';

export const undefinedValue = '__undefined__';

export type ClearableSelectProps = {
    items: string[];
    initiallySelectedItem?: string | null;
    onChange?: (item: string | null) => void;
    placeholderText?: string;
    value?: string | null;
    selectClassName?: string;
    className?: string;
};

export function ClearableSelect({
    items,
    initiallySelectedItem,
    onChange,
    placeholderText,
    className,
    value,
    selectClassName,
}: ClearableSelectProps) {
    const [selectedOption, setSelectedOption] = useState<string | null>(initiallySelectedItem ?? null);

    useEffect(() => {
        if (value !== undefined) {
            setSelectedOption(value);
        }
    }, [value]);

    const handleClear = () => {
        setSelectedOption(null);
        if (onChange) {
            onChange(null);
        }
    };

    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const newValue = event.currentTarget.value;
        setSelectedOption(newValue);
        if (onChange) {
            onChange(newValue);
        }
    };

    return (
        <div className={`relative inline min-w-24 ${className}`}>
            <select
                className={`select w-full pr-14 ${selectClassName}`}
                value={selectedOption ?? undefinedValue}
                onChange={handleChange}
            >
                <option value={undefinedValue} disabled>
                    {placeholderText ?? 'Select an option'}
                </option>
                {items.map((item) => (
                    <option key={item} value={item}>
                        {item}
                    </option>
                ))}
            </select>
            {selectedOption && (
                <button
                    onClick={handleClear}
                    className='absolute top-1/2 right-10 -translate-y-1/2 cursor-pointer border-0 bg-transparent'
                >
                    <DeleteIcon />
                </button>
            )}
        </div>
    );
}
