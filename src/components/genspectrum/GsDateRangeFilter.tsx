import { useEffect, useRef } from 'react';

import { GsDateRangeFilter as DateRangeFilter } from './gs-date-range-filter';
import { CustomDateRangeLabel } from '../../types/DateWindow';
import { gsEventNames } from '../../util/gsEventNames';
import { type DateRangeOption, type DateRangeOptionChangedEvent } from '../dateRangeFilter/dateRangeOption';

export function GsDateRangeFilter({
    onDateRangeChange = () => {},
    value,
    dateRangeOptions,
    width,
}: {
    onDateRangeChange?: (dateRange: DateRangeOption | null) => void;
    value?: DateRangeOption | null;
    dateRangeOptions?: DateRangeOption[];
    width?: string;
}) {
    const dateRangeSelectorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentDateRangeSelectorRef = dateRangeSelectorRef.current;
        if (!currentDateRangeSelectorRef) {
            return;
        }

        const handleDateRangeOptionChange = (event: DateRangeOptionChangedEvent) => {
            const dateRange = event.detail;

            if (dateRange === null) {
                onDateRangeChange(null);
            } else if (typeof dateRange === 'string') {
                const dateRangeOption = dateRangeOptions?.find((option) => option.label === dateRange);
                if (dateRangeOption !== undefined) {
                    onDateRangeChange(dateRangeOption);
                } else {
                    throw new Error(`Invalid date range option: ${dateRange}`);
                }
            } else {
                onDateRangeChange({ label: CustomDateRangeLabel, ...dateRange });
            }
        };

        currentDateRangeSelectorRef.addEventListener(gsEventNames.dateRangeOptionChanged, handleDateRangeOptionChange);

        return () => {
            currentDateRangeSelectorRef.removeEventListener(
                gsEventNames.dateRangeOptionChanged,
                handleDateRangeOptionChange,
            );
        };
    }, [dateRangeOptions, onDateRangeChange, dateRangeSelectorRef]);

    const isCustom = value?.label === CustomDateRangeLabel;

    // See GsTextFilter.tsx for why listening on a wrapping div still catches the same event.
    return (
        <div ref={dateRangeSelectorRef}>
            <DateRangeFilter
                dateRangeOptions={dateRangeOptions}
                value={(isCustom ? value : value?.label) ?? null}
                width={width}
            />
        </div>
    );
}
