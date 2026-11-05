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
    dateFrom: z.iso.date().optional(),
    /**
     * The end date of the date range in the format `YYYY-MM-DD`.
     */
    dateTo: z.iso.date().optional(),
});

export type DateRangeOption = z.infer<typeof dateRangeOptionSchema>;

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
 * The short name of a preset in a URL: like `90d` for "Most recent 90 days", and `all` for "All times".
 * `undefined` for a label that isn't one of a preset.
 */
export function presetToken(label: string): string | undefined {
    if (label === ALL_TIMES_LABEL) {
        return 'all';
    }
    const days = RECENT_DAYS_OPTIONS.find((option) => recentDaysLabel(option) === label);
    return days === undefined ? undefined : `${days}d`;
}

/** The label of the preset with the short name `token` (see `presetToken`), or `undefined` if there's none. */
export function presetLabel(token: string): string | undefined {
    if (token === 'all') {
        return ALL_TIMES_LABEL;
    }
    const days = RECENT_DAYS_OPTIONS.find((option) => `${option}d` === token);
    return days === undefined ? undefined : recentDaysLabel(days);
}

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

/**
 * `value` with concrete dates, looked up in `dateRangeOptions`: a preset named by its label alone (as in
 * the URL) gets its dates, and a custom range with the dates of a preset is that preset (e.g. after typing
 * the dates of the most recent 30 days). A label that names no preset falls back to "All times".
 */
export function resolveDateRange(value: DateRangeOption, dateRangeOptions: DateRangeOption[]): DateRangeOption {
    if (value.label === CUSTOM_DATE_RANGE_LABEL) {
        return (
            dateRangeOptions.find((option) => option.dateFrom === value.dateFrom && option.dateTo === value.dateTo) ??
            value
        );
    }
    return (
        dateRangeOptions.find((option) => option.label === value.label) ??
        dateRangeOptions.find((option) => option.label === ALL_TIMES_LABEL) ?? { label: ALL_TIMES_LABEL }
    );
}
