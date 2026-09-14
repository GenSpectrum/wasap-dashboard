import { type DateRangeOption } from '../dateRangeFilter/dateRangeOption';
import { useDateExtent } from '../../data/reads';
import { useMemo } from 'react';

import { CustomDateRangeLabel } from '../../types/DateWindow';
import { Loading } from '../../util/Loading';
import { GsDateRangeFilter } from '../genspectrum/GsDateRangeFilter';

/**
 * Computes the available date-range options dynamically from the newest
 * sampling date in the dataset (read from SILO via `useDateExtent`).
 */
export function DynamicDateFilter({
    label,
    generateOptions,
    value,
    onChange,
}: {
    label: string;
    generateOptions: ({ startDate, endDate }: { startDate: string; endDate: string }) => DateRangeOption[];
    value: DateRangeOption | undefined;
    onChange: (newValue: DateRangeOption | undefined) => void;
}) {
    const { data: dateExtent, isPending, isError, error } = useDateExtent();

    const generatedOptions = useMemo(() => {
        if (!dateExtent) {
            return [];
        }
        return generateOptions({ startDate: dateExtent.min, endDate: dateExtent.max });
    }, [dateExtent, generateOptions]);

    // When the value has a "Custom" label, try to match it back to one of the generated options
    // by comparing dateFrom and dateTo. If there's a match, use that option's label instead of "Custom".
    const normalizedValue = useMemo(() => {
        if (value?.label !== CustomDateRangeLabel) {
            return value;
        }

        const matchingOption = generatedOptions.find(
            (option) => option.dateFrom === value.dateFrom && option.dateTo === value.dateTo,
        );

        return matchingOption ?? value;
    }, [value, generatedOptions]);

    return (
        <label className='form-control'>
            <div className='label'>
                <span className='label-text'>{label}</span>
            </div>
            {isPending ? (
                <div className='h-20'>
                    <Loading />
                </div>
            ) : isError ? (
                <div className='flex h-20 items-center'>
                    Failed to load date range: {error instanceof Error ? error.message : String(error)}
                </div>
            ) : (
                <GsDateRangeFilter
                    onDateRangeChange={(dateRange: DateRangeOption | null) => onChange(dateRange ?? undefined)}
                    value={normalizedValue}
                    dateRangeOptions={generatedOptions}
                />
            )}
        </label>
    );
}
