import type { ReactNode } from 'react';

import { LabeledField } from './LabeledField';

/**
 * An input for numeric values: a slider and a number field with step buttons, in one box.
 */
export function NumericInput({
    label,
    info,
    infoModal,
    value,
    min,
    max,
    step,
    onChange,
}: {
    label: string;
    info?: ReactNode;
    infoModal?: ReactNode;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
}) {
    const stepBy = (direction: 1 | -1) => onChange(stepValue(value, direction, { min, max, step }));

    return (
        <LabeledField label={label} info={info} infoModal={infoModal}>
            {/* One box: the slider for coarse changes, the number with its step buttons for exact ones. */}
            <div className='input w-full gap-0 px-0'>
                <div className='flex h-full min-w-0 grow items-center bg-stone-100 px-3'>
                    <input
                        className='accent-primary min-w-0 grow appearance-auto'
                        type='range'
                        aria-label={label}
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                    />
                </div>
                {/* The browser's spin buttons are hidden for the full-height ones below, which can be
                    styled; the arrow keys still step the field. */}
                <input
                    className='h-full w-14 shrink-0 [appearance:textfield] border-l border-gray-300 pl-3 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                    type='number'
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => {
                        const parsedNumber = Number(e.target.value);
                        if (Number.isFinite(parsedNumber)) {
                            onChange(parsedNumber);
                        }
                    }}
                />
                <div className='flex h-full shrink-0 flex-col border-l border-gray-300'>
                    <StepButton
                        icon='mdi--chevron-up'
                        ariaLabel={`Increase ${label}`}
                        disabled={value >= max}
                        onClick={() => stepBy(1)}
                    />
                    <StepButton
                        icon='mdi--chevron-down'
                        ariaLabel={`Decrease ${label}`}
                        disabled={value <= min}
                        onClick={() => stepBy(-1)}
                        className='border-t border-gray-300'
                    />
                </div>
            </div>
        </LabeledField>
    );
}

function StepButton({
    icon,
    ariaLabel,
    disabled,
    onClick,
    className = '',
}: {
    icon: string;
    ariaLabel: string;
    disabled: boolean;
    onClick: () => void;
    className?: string;
}) {
    return (
        <button
            type='button'
            // Out of the tab order, and not focused by a click either (which would outline the whole box):
            // the arrow keys in the number field do the same.
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={onClick}
            className={`flex min-h-0 flex-1 cursor-pointer items-center justify-center bg-stone-100 px-1.5 hover:bg-stone-200 disabled:cursor-default disabled:text-stone-300 disabled:hover:bg-stone-100 ${className}`}
        >
            <span className={`iconify text-sm ${icon}`} />
        </button>
    );
}

/** Steps `value` by one `step` like a number field's spin buttons: onto the step grid, within min and max. */
export function stepValue(
    value: number,
    direction: 1 | -1,
    { min, max, step }: { min: number; max: number; step: number },
) {
    const steps = Math.round((value - min) / step) + direction;
    const decimals = (String(step).split('.')[1] ?? '').length;
    return Math.min(max, Math.max(min, Number((min + steps * step).toFixed(decimals))));
}
