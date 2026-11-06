import { useMemo } from 'react';

import { DateRangeDropdown } from './dateRangeFilter/DateRangeDropdown';
import { useDateExtent } from '../../dataLayer/hooks/lookups/dateExtent';
import { type DateRangeOption } from '../../domain/dateRange';
import { LoadingDisplay } from '../ui/LoadingDisplay';

/**
 * Computes the available date-range options dynamically from the newest
 * sampling date in the dataset (read from RhyDB via `useDateExtent`).
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

    return (
        // Not a <label>: it would forward its clicks to the first control in the dropdown.
        <div>
            <div className='label flex'>
                <span>{label}</span>
            </div>
            {isPending ? (
                <div className='h-20'>
                    <LoadingDisplay />
                </div>
            ) : isError ? (
                <div className='flex h-20 items-center'>
                    Failed to load date range: {error instanceof Error ? error.message : String(error)}
                </div>
            ) : (
                <DateRangeDropdown dateRangeOptions={generatedOptions} value={value} onChange={onChange} />
            )}
        </div>
    );
}
