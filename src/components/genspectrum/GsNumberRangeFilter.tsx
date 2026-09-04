import {
    gsEventNames,
    type NumberRangeFilterChangedEvent,
    type NumberRangeValueChangedEvent,
    type LapisNumberFilter,
    type NumberRange,
} from 'wasap-components/util';
import { useEffect, useRef } from 'react';
import { GsNumberRangeFilter as NumberRangeFilter } from 'wasap-components/gsComponents/gs-number-range-filter';

export function GsNumberRangeFilter({
    lapisField,
    width,
    onNumberRangeChanged = () => {},
    onLapisFilterChanged = () => {},
    value,
    sliderMin,
    sliderMax,
    sliderStep,
}: {
    lapisField: string;
    width?: string;
    onNumberRangeChanged?: (numberRange: NumberRange) => void;
    onLapisFilterChanged?: (lapisFilter: LapisNumberFilter) => void;
    value?: NumberRange;
    sliderMin?: number;
    sliderMax?: number;
    sliderStep?: number;
}) {
    const numberRangeFilterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentInputRef = numberRangeFilterRef.current;
        if (currentInputRef === null) {
            return;
        }

        const handleNumberRangeFilterChange = (event: NumberRangeValueChangedEvent) => {
            onNumberRangeChanged(event.detail);
        };

        const handleLapisFilterChange = (event: NumberRangeFilterChangedEvent) => {
            onLapisFilterChanged(event.detail);
        };

        currentInputRef.addEventListener(gsEventNames.numberRangeValueChanged, handleNumberRangeFilterChange);
        currentInputRef.addEventListener(gsEventNames.numberRangeFilterChanged, handleLapisFilterChange);

        return () => {
            currentInputRef.removeEventListener(gsEventNames.numberRangeValueChanged, handleNumberRangeFilterChange);
            currentInputRef.removeEventListener(gsEventNames.numberRangeFilterChanged, handleLapisFilterChange);
        };
    }, [onLapisFilterChanged, onNumberRangeChanged]);

    // See GsTextFilter.tsx for why listening on a wrapping div still catches the same event.
    return (
        <div ref={numberRangeFilterRef}>
            <NumberRangeFilter
                lapisField={lapisField}
                width={width}
                value={value ?? {}}
                sliderMin={sliderMin}
                sliderMax={sliderMax}
                sliderStep={sliderStep}
            />
        </div>
    );
}
