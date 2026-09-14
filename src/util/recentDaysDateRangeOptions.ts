import dayjs from 'dayjs';

import { type DateRangeOption } from '../components/dateRangeFilter/dateRangeOption';
import { ALL_TIMES_LABEL } from '../types/DateWindow';

function recentDaysLabel(days: number): string {
    return `Most recent ${days} days`;
}

const RECENT_DAYS_OPTIONS = [7, 14, 30, 60, 90] as const;

/**
 * The default `samplingDate` for a bare WASAP URL (`WasapPageStateHandler`).
 * An unrestricted range at 'day' granularity can exceed mutations-over-time's
 * column limit ("Too many dates"); this bounds it without guessing at a fixed
 * window size.
 */
export const DEFAULT_RECENT_DAYS_LABEL = recentDaysLabel(RECENT_DAYS_OPTIONS[4]);

/**
 * Generates date range options for "most recent X days" where X is 7, 14, 30,
 * 60, or 90, counting backwards from the given end date, plus an "All times"
 * option bounded by the given start date (the earliest date actually present
 * in the dataset).
 */
export function recentDaysDateRangeOptions({
    startDate,
    endDate,
}: {
    startDate: string;
    endDate: string;
}): DateRangeOption[] {
    const end = dayjs(endDate);

    const recentDaysOptions = RECENT_DAYS_OPTIONS.map((days) => {
        const start = end.subtract(days - 1, 'day');
        return {
            label: recentDaysLabel(days),
            dateFrom: start.format('YYYY-MM-DD'),
            dateTo: end.format('YYYY-MM-DD'),
        };
    });

    return [...recentDaysOptions, { label: ALL_TIMES_LABEL, dateFrom: startDate }];
}
