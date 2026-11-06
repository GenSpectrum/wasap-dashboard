import { DateRangeFilter } from './DateRangeFilter';
import {
    ALL_TIMES_LABEL,
    CUSTOM_DATE_RANGE_LABEL,
    type DateRangeOption,
    resolveDateRange,
} from '../../../domain/dateRange';
import { CellDropdown } from '../CellDropdown';
import { useDraftDropdown } from '../useDraftDropdown';

/**
 * A button that says which date range is picked, e.g. "Most recent 90 days, Jul 7 – Oct 4, 2026", and opens
 * the `DateRangeFilter` (a preset, and the dates from and to). What is changed there is applied when the
 * dropdown closes, so that both dates of a custom range can be set before anything is loaded.
 */
export function DateRangeDropdown({
    dateRangeOptions,
    value,
    onChange,
    label,
    icon,
}: {
    dateRangeOptions: DateRangeOption[];
    /** What the dropdown is, for screen readers: the button shows only the range. */
    label: string;
    /** An iconify class for the icon at the start of the button, e.g. `mdi--calendar-blank-outline`. */
    icon: string;
    value: DateRangeOption | undefined;
    onChange: (value: DateRangeOption | undefined) => void;
}) {
    const resolve = (range: DateRangeOption | undefined) =>
        resolveDateRange(range ?? { label: ALL_TIMES_LABEL }, dateRangeOptions);
    const dropdown = useDraftDropdown(value, (draft) => {
        // Resolved, so that e.g. picking the preset that a bare label in the URL names isn't a change.
        const [before, after] = [resolve(value), resolve(draft)];
        if (after.label !== before.label || after.dateFrom !== before.dateFrom || after.dateTo !== before.dateTo) {
            onChange(draft);
        }
    });
    const shown = resolve(dropdown.shown);

    return (
        <CellDropdown
            dropdown={dropdown}
            label={label}
            icon={icon}
            summary={<span className='grow truncate'>{describeDateRange(shown)}</span>}
            // Wider than the button where there is room, for the preset and the two dates. Towards the left in the
            // dataset bar's one-row layout, where the date is near the right edge, under the locations.
            menuClassName='w-full p-2 md:min-w-[32rem] xl:right-0'
        >
            <DateRangeFilter dateRangeOptions={dateRangeOptions} value={shown} onChange={dropdown.setDraft} />
        </CellDropdown>
    );
}

/**
 * E.g. "Most recent 90 days, Jul 7 – Oct 4, 2026", "All times, since Jan 8, 2023", or for a custom range
 * "Sep 1 – Sep 30, 2026 (30 days)".
 */
export function describeDateRange(value: DateRangeOption) {
    const { dateFrom, dateTo } = value;
    const dates =
        dateFrom !== undefined && dateTo !== undefined
            ? formatRange(dateFrom, dateTo)
            : dateFrom !== undefined
              ? `since ${formatDate(dateFrom, true)}`
              : dateTo !== undefined
                ? `until ${formatDate(dateTo, true)}`
                : '';
    if (value.label === CUSTOM_DATE_RANGE_LABEL) {
        if (dates === '') {
            return 'All dates';
        }
        return dateFrom !== undefined && dateTo !== undefined ? `${dates} (${formatDays(dateFrom, dateTo)})` : dates;
    }
    return dates === '' ? value.label : `${value.label}, ${dates}`;
}

/** The year once at the end if both dates are in it: "Jul 7 – Oct 4, 2026", else "Dec 1, 2025 – Feb 3, 2026". */
function formatRange(dateFrom: string, dateTo: string) {
    if (dateFrom === dateTo) {
        return formatDate(dateFrom, true);
    }
    const sameYear = dateFrom.slice(0, 4) === dateTo.slice(0, 4);
    return `${formatDate(dateFrom, !sameYear)} – ${formatDate(dateTo, true)}`;
}

/** How many days the range has, both ends included: "30 days", or "1 day". */
function formatDays(dateFrom: string, dateTo: string) {
    // In UTC, so that a change to or from summer time doesn't take an hour off a day.
    const days = (Date.parse(dateTo) - Date.parse(dateFrom)) / 86_400_000 + 1;
    return days === 1 ? '1 day' : `${days} days`;
}

/** A `YYYY-MM-DD` date as e.g. "Jul 7" or "Jul 7, 2026", read as a calendar date (no time zone shift). */
function formatDate(date: string, withYear: boolean) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: withYear ? 'numeric' : undefined,
    });
}
