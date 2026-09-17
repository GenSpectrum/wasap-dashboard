import { useState, type InputEvent, type FC } from 'react';

// Previously injected only into this component's Lit shadow root by PreactLitAdapter (see
// the step-2 Lit-removal commit). There's no shadow DOM to scope it to any more, so the
// selectors in this file target the `min-max-range-slider` class below rather than the bare
// `input[type=range]` tag, to avoid leaking onto unrelated range inputs elsewhere in the app
// (e.g. `NumericInput`'s single-thumb slider).
import './min-max-percent-slider.css';

export interface MinMaxPercentSliderProps {
    min: number;
    max: number;
    setMin: (min: number) => void;
    setMax: (max: number) => void;
    onDrop?: () => void;
    rangeMin?: number;
    rangeMax?: number;
    step?: number;
}

export const MinMaxRangeSlider: FC<MinMaxPercentSliderProps> = ({
    min,
    max,
    setMin,
    setMax,
    onDrop,
    rangeMin = 0,
    rangeMax = 100,
    step = 0.1,
}) => {
    const sliderColor = '#C6C6C6';
    const rangeColor = 'var(--color-brand-700)';

    const [zIndexTo, setZIndexTo] = useState(0);

    const onMinChange = (event: InputEvent<HTMLInputElement>) => {
        const input = event.target as HTMLInputElement;
        const minValue = Number(input.value);

        if (minValue > max) {
            setMax(minValue);
            setMin(minValue);
        } else {
            setMin(minValue);
        }
    };

    const onMaxChange = (event: InputEvent<HTMLInputElement>) => {
        const input = event.target as HTMLInputElement;
        const maxValue = Number(input.value);

        if (maxValue <= 0) {
            setZIndexTo(2);
        } else {
            setZIndexTo(0);
        }

        if (maxValue < min) {
            setMin(maxValue);
            setMax(maxValue);
        } else {
            setMax(maxValue);
        }
    };

    const lowerBoundary = getGradientBoundary(min, rangeMin, rangeMax);
    const upperBoundary = getGradientBoundary(max, rangeMin, rangeMax);
    const background = `
        linear-gradient(
            to right,
            ${sliderColor} 0%,
            ${sliderColor} ${lowerBoundary}%,
            ${rangeColor} ${lowerBoundary}%,
            ${rangeColor} ${upperBoundary}%,
            ${sliderColor} ${upperBoundary}%,
            ${sliderColor} 100%)
    `;

    return (
        <div className='relative my-4 h-full w-full'>
            <input
                id='fromSlider'
                className='min-max-range-slider'
                type='range'
                value={min}
                onInput={onMinChange}
                onMouseUp={() => onDrop?.()}
                onTouchEnd={() => onDrop?.()}
                min={`${rangeMin}`}
                max={`${rangeMax}`}
                step={step}
                style={{ background, zIndex: 1, height: 0 }}
            />
            <input
                id='toSlider'
                className='min-max-range-slider'
                type='range'
                value={max}
                min={`${rangeMin}`}
                max={`${rangeMax}`}
                step={step}
                onInput={onMaxChange}
                onMouseUp={() => onDrop?.()}
                onTouchEnd={() => onDrop?.()}
                style={{ background, zIndex: zIndexTo }}
            />
        </div>
    );
};

/**
 * This is a linear function that returns 0 for x = lowerBound and 100 for x = upperBound.
 */
function getGradientBoundary(x: number, lowerBound: number, upperBound: number) {
    return ((x - lowerBound) / (upperBound - lowerBound)) * 100;
}
