import { LabeledField } from './LabeledField';
import type { WasapMeanProportion } from '../../../../pageState/wasap/wasapAnalysisFilter';
import { MinMaxRangeSlider } from '../../../shared/min-max-range-slider';

/**
 * Selects the interval that the mean proportion of a mutation (or query) over the
 * selected time range has to be in for it to be displayed.
 *
 * TODO: This is roughly 80% of the way to looking like the other sidebar sliders
 * (`NumericInput`) - the thumbs of the range slider are still the 24px white circles from the
 * over-time toolbar, not the native accent-colored ones. Revisit to make them match.
 */
export function MeanProportionField({
    value,
    onChange,
}: {
    value: WasapMeanProportion;
    onChange: (v: WasapMeanProportion) => void;
}) {
    const indicateError = value.lower > value.upper;

    return (
        <LabeledField
            label='Mean proportion'
            info={
                <p>
                    Only mutations whose mean proportion over the selected time range is within this interval are
                    displayed. Use it to hide mutations that are hardly ever, or always, found.
                </p>
            }
        >
            <div className='w-full'>
                <div className='flex items-center gap-2'>
                    <ProportionInput
                        label='Lower'
                        value={value.lower}
                        indicateError={indicateError}
                        onChange={(lower) => onChange({ ...value, lower })}
                    />
                    <span>-</span>
                    <ProportionInput
                        label='Upper'
                        value={value.upper}
                        indicateError={indicateError}
                        onChange={(upper) => onChange({ ...value, upper })}
                    />
                </div>
                <div className='px-3'>
                    <MinMaxRangeSlider
                        min={value.lower}
                        max={value.upper}
                        setMin={(lower) => onChange({ ...value, lower })}
                        setMax={(upper) => onChange({ ...value, upper })}
                        rangeMin={0}
                        rangeMax={1}
                        step={0.01}
                        rangeColor='var(--color-primary)'
                    />
                </div>
            </div>
        </LabeledField>
    );
}

function ProportionInput({
    label,
    value,
    indicateError,
    onChange,
}: {
    label: string;
    value: number;
    indicateError: boolean;
    onChange: (v: number) => void;
}) {
    return (
        <input
            className={`input input-bordered w-full min-w-0 ${indicateError ? 'input-error' : ''}`}
            type='number'
            aria-label={`${label} mean proportion`}
            min={0}
            max={1}
            step={0.01}
            value={value}
            onChange={(e) => {
                const parsedNumber = Number(e.target.value);
                if (e.target.value !== '' && Number.isFinite(parsedNumber)) {
                    onChange(Math.min(1, Math.max(0, parsedNumber)));
                }
            }}
        />
    );
}
