import dayjs from 'dayjs';
import z from 'zod';

/**
 * A date range option of the date range filter.
 */
export const dateRangeOptionSchema = z.object({
    /** The label of the date range option that will be shown to the user */
    label: z.string(),
    /**
     * The start date of the date range in the format `YYYY-MM-DD`.
     */
    dateFrom: z.string().date().optional(),
    /**
     * The end date of the date range in the format `YYYY-MM-DD`.
     */
    dateTo: z.string().date().optional(),
});

export type DateRangeOption = z.infer<typeof dateRangeOptionSchema>;

export const dateRangeValueSchema = z
    .union([
        z.string(),
        z.object({
            dateFrom: z.string().date().optional(),
            dateTo: z.string().date().optional(),
        }),
    ])
    .nullable();

export type DateRangeValue = z.infer<typeof dateRangeValueSchema>;

export const CUSTOM_DATE_RANGE_LABEL = 'Custom';

/** The "no restriction" date-range option label — deliberate, not the default (see doc on `DEFAULT_RECENT_DAYS_LABEL`). */
export const ALL_TIMES_LABEL = 'All times';

function recentDaysLabel(days: number): string {
    return `Most recent ${days} days`;
}

const RECENT_DAYS_OPTIONS = [7, 14, 30, 60, 90] as const;

/**
 * The default `samplingDate` for a bare WASAP URL (see `parseDatasetFilter`).
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
