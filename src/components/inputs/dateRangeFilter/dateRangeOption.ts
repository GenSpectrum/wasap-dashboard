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
