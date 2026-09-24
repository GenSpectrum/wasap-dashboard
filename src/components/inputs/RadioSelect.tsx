import { Fragment, useId } from 'react';

import { LabeledField } from './LabeledField';

/**
 * A radio select as an alternative to a dropdown, styled as two (or more) buttons,
 * laid out side by side or, for longer lists, stacked vertically.
 */
export function RadioSelect<T extends string>({
    label,
    value,
    options,
    onChange,
    direction = 'horizontal',
}: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (val: T) => void;
    direction?: 'horizontal' | 'vertical';
}) {
    const id = useId();

    return (
        <>
            <LabeledField label={label}>
                <div className={`flex gap-2 text-sm ${direction === 'vertical' ? 'flex-col' : ''}`}>
                    {options.map((opt) => {
                        const isChecked = value === opt.value;
                        return (
                            <Fragment key={opt.value}>
                                <input
                                    type='radio'
                                    id={`${id}-${opt.value}`}
                                    name={id}
                                    value={opt.value}
                                    className='hidden'
                                    checked={isChecked}
                                    onChange={() => onChange(opt.value)}
                                />
                                <label
                                    htmlFor={`${id}-${opt.value}`}
                                    className={`flex-1 cursor-pointer border bg-white p-2 text-center ${
                                        isChecked ? 'border-primary' : 'border-gray-300'
                                    }`}
                                >
                                    {opt.label}
                                </label>
                            </Fragment>
                        );
                    })}
                </div>
            </LabeledField>
        </>
    );
}
