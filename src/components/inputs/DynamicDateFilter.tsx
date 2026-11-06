import { useMemo } from 'react';

import { CellDropdownLoading } from './CellDropdown';
import { DateRangeDropdown } from './dateRangeFilter/DateRangeDropdown';
import { useDateExtent } from '../../dataLayer/hooks/lookups/dateExtent';
import { type DateRangeOption } from '../../domain/dateRange';

/**
 * Computes the available date-range options dynamically from the newest
 * sampling date in the dataset (read from RhyDB via `useDateExtent`).
 */
export function DynamicDateFilter({
    label,
    icon,
    generateOptions,
    value,
    onChange,
}: {
    /** What the dropdown is, for screen readers: its button shows only the range. */
    label: string;
    /** An iconify class for the icon at the start of the button. */
    icon: string;
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
        <div className='h-full'>
            {isPending ? (
                <CellDropdownLoading />
            ) : isError ? (
                <div className='flex h-full items-center'>
                    Failed to load date range: {error instanceof Error ? error.message : String(error)}
                </div>
            ) : (
                <DateRangeDropdown
                    dateRangeOptions={generatedOptions}
                    value={value}
                    onChange={onChange}
                    label={label}
                    icon={icon}
                />
            )}
        </div>
    );
}
