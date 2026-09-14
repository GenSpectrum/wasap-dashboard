import { useDateExtent } from '../../../data/reads';
import { ALL_TIMES_LABEL } from '../../../types/DateWindow';
import { recentDaysDateRangeOptions } from '../../../util/recentDaysDateRangeOptions';
import { isUnresolvedSamplingDate } from '../../../views/pageStateHandlers/WasapPageStateHandler';
import { type DateRangeOption } from '../../dateRangeFilter/dateRangeOption';

const allTimes: DateRangeOption = { label: ALL_TIMES_LABEL };

/**
 * Resolves a `samplingDate` that may just be a preset label (e.g. "Most recent
 * 14 days", from a URL loaded fresh) into concrete dates, by reading the
 * dataset's actual date range from SILO (`useDateExtent`) and matching the
 * label against the same options `DynamicDateFilter` generates for the
 * dropdown.
 *
 * If `samplingDate` already has concrete dates, this returns it immediately —
 * only label-only values pay for the read. If the date extent can't be read,
 * or the label doesn't match any known option, this falls back to "All times"
 * rather than guessing a window — simpler than a synthetic wall-clock default,
 * and the safest thing to show when the actual data extent isn't known (the
 * dataset's latest sample can lag well behind today).
 */
export function useResolvedSamplingDate(samplingDateFromPageState: DateRangeOption | undefined): {
    samplingDate: DateRangeOption;
    isPending: boolean;
} {
    const samplingDate = samplingDateFromPageState ?? allTimes;
    const needsResolution = isUnresolvedSamplingDate(samplingDate);

    const { data: dateExtent, isPending, isError } = useDateExtent({}, { enabled: needsResolution });

    if (!needsResolution) {
        return { samplingDate, isPending: false };
    }

    if (isPending) {
        return { samplingDate, isPending: true };
    }

    if (isError || dateExtent === null) {
        return { samplingDate: allTimes, isPending: false };
    }

    const options = recentDaysDateRangeOptions({ startDate: dateExtent.min, endDate: dateExtent.max });
    const resolved = options.find((option) => option.label === samplingDate.label);

    return {
        samplingDate: resolved ?? options.find((option) => option.label === ALL_TIMES_LABEL) ?? allTimes,
        isPending: false,
    };
}
