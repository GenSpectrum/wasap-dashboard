import { useId, type PropsWithChildren } from 'react';

import { Inset } from '../shared/Inset';

/**
 * A pick of one of a few options as tabs, with the controls for the picked one in the panel
 * below: for a choice that decides which other controls there are. The picked tab opens into the
 * panel: it has no bottom border, which the other tabs draw instead. The tabs fill the width, each
 * as wide as its label plus a share of the rest.
 */
export function TabbedPanel<T extends string>({
    label,
    value,
    options,
    onChange,
    children,
}: PropsWithChildren<{
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}>) {
    const panelId = useId();

    return (
        <div className='form-control'>
            <span className='label label-text'>{label}</span>
            <div role='tablist' aria-label={label} className='flex'>
                {options.map((option) => {
                    const isSelected = option.value === value;
                    return (
                        <button
                            key={option.value}
                            type='button'
                            role='tab'
                            aria-selected={isSelected}
                            aria-controls={panelId}
                            onClick={() => onChange(option.value)}
                            className={`flex-auto cursor-pointer border px-2 py-1 text-sm font-semibold whitespace-nowrap ${
                                isSelected
                                    ? 'text-brand-700 border-stone-300 border-b-transparent bg-stone-300/40'
                                    : 'border-transparent border-b-stone-300 text-gray-700 hover:bg-stone-300'
                            }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
            <Inset className='border-t-0 p-2'>
                <div role='tabpanel' id={panelId} className='flex flex-col gap-2'>
                    {children}
                </div>
            </Inset>
        </div>
    );
}
