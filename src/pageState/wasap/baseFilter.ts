import { type WasapBaseFilter, type WasapDatasetFilter, type WasapMeanProportion } from './wasapAnalysisFilter';
import { type DateRangeOption } from '../../components/inputs/dateRangeFilter/dateRangeOption';
import { type WasapPageConfig } from '../../config/wasapPageConfig';
import { CustomDateRangeLabel } from '../../types/DateWindow';
import { type TemporalGranularity } from '../../types/dashboardComponents';
import { DEFAULT_RECENT_DAYS_LABEL } from '../../util/recentDaysDateRangeOptions';
import { getStringFromSearch, setSearchFromDateRange, setSearchFromString } from '../urlSearchParams';

/**
 * Parsing and serializing of the settings that every analysis mode page has in
 * common (location, sampling date, granularity, ...), so that the page state
 * handlers of the individual modes don't have to repeat it.
 *
 * Only the mean proportion depends on the mode: its default is passed in.
 */
export function parseBaseFilter(
    search: URLSearchParams,
    config: Pick<WasapPageConfig, 'locationNameField' | 'samplingDateField' | 'defaultLocationName'>,
    defaultMeanProportion: WasapMeanProportion,
): WasapBaseFilter {
    return {
        ...parseDatasetFilter(search, config),
        meanProportion: {
            lower: parseProportion(getStringFromSearch(search, 'meanProportionLower')) ?? defaultMeanProportion.lower,
            upper: parseProportion(getStringFromSearch(search, 'meanProportionUpper')) ?? defaultMeanProportion.upper,
        },
    };
}

/** The part of the base filter that selects the dataset, and is the same for all modes. */
export function parseDatasetFilter(
    search: URLSearchParams,
    config: Pick<WasapPageConfig, 'locationNameField' | 'samplingDateField' | 'defaultLocationName'>,
): WasapDatasetFilter {
    const samplingDate = parseSamplingDateFromUrl(search, config.samplingDateField);

    // An unrestricted date range at 'day' granularity can span more days than
    // mutations-over-time supports (it refuses past 200 columns, "Too many
    // dates"), so a bare URL defaults to a recent window instead. Users can
    // still pick "All times" explicitly from the date filter's dropdown.
    const defaultSamplingDate: DateRangeOption = { label: DEFAULT_RECENT_DAYS_LABEL };

    return {
        locationName: getStringFromSearch(search, config.locationNameField) ?? config.defaultLocationName,
        samplingDate: samplingDate ?? defaultSamplingDate,
        granularity: (getStringFromSearch(search, 'granularity') as TemporalGranularity | undefined) ?? 'day',
        excludeEmpty: getStringFromSearch(search, 'excludeEmpty') !== 'false',
    };
}

/**
 * Writes the base filter into `search`, which the analysis mode then adds its
 * own settings to.
 */
export function setBaseFilterSearchParams(
    search: URLSearchParams,
    base: WasapBaseFilter,
    config: Pick<WasapPageConfig, 'locationNameField' | 'samplingDateField'>,
    defaultMeanProportion: WasapMeanProportion,
) {
    setDatasetFilterSearchParams(search, base, config);
    // Omitted when it's the mode's default, so the default can still differ between modes.
    if (base.meanProportion.lower !== defaultMeanProportion.lower) {
        setSearchFromString(search, 'meanProportionLower', String(base.meanProportion.lower));
    }
    if (base.meanProportion.upper !== defaultMeanProportion.upper) {
        setSearchFromString(search, 'meanProportionUpper', String(base.meanProportion.upper));
    }
}

export function setDatasetFilterSearchParams(
    search: URLSearchParams,
    dataset: WasapDatasetFilter,
    config: Pick<WasapPageConfig, 'locationNameField' | 'samplingDateField'>,
) {
    setSearchFromString(search, config.locationNameField, dataset.locationName);
    // Presets (e.g. "Most recent 14 days") serialize as their label, so reloading
    // the URL re-resolves them against the dataset's current date range instead of
    // pinning stale dates (see useResolvedSamplingDate). Explicit custom ranges
    // still serialize as literal dates — setSearchFromDateRange already branches
    // on the label.
    setSearchFromDateRange(search, config.samplingDateField, dataset.samplingDate);
    setSearchFromString(search, 'granularity', dataset.granularity);
    if (!dataset.excludeEmpty) {
        setSearchFromString(search, 'excludeEmpty', 'false');
    }
}

/**
 * The search params to take along when going to the page of another mode: the
 * dataset filter, but not the mean proportion, which has a different default
 * in each mode.
 */
export function datasetFilterSearchParams(
    dataset: WasapDatasetFilter,
    config: Pick<WasapPageConfig, 'locationNameField' | 'samplingDateField'>,
): URLSearchParams {
    const search = new URLSearchParams();
    setDatasetFilterSearchParams(search, dataset, config);
    return search;
}

/**
 * `search` with the dataset filter replaced by the given one, and everything else
 * (the settings of the mode, the mean proportion) left as it is.
 */
export function withDatasetFilter(
    search: URLSearchParams,
    dataset: WasapDatasetFilter,
    config: Pick<WasapPageConfig, 'locationNameField' | 'samplingDateField'>,
): URLSearchParams {
    const datasetParams = [config.locationNameField, config.samplingDateField, 'granularity', 'excludeEmpty'];

    const result = datasetFilterSearchParams(dataset, config);
    for (const [name, value] of search) {
        if (!datasetParams.includes(name)) {
            result.append(name, value);
        }
    }
    return result;
}

/**
 * Parses the `samplingDate` URL param, which is either literal `dateFrom--dateTo`
 * dates or a preset's label (e.g. "Most recent 14 days") written by `toUrl`. A
 * label-only value has no concrete dates yet: WASAP's presets are relative to
 * the dataset's actual latest sample date (which can lag behind today), not to
 * today, so they can only be resolved once that date range has been read from
 * SILO. See `useResolvedSamplingDate`, which does that resolution — this
 * function only parses, deliberately not against a fixed options list (the old
 * `{ type: 'date', dateRangeOptions: () => [] }` mechanism never had one to
 * match against, which is why a preset label from the URL never resolved).
 */
function parseSamplingDateFromUrl(search: URLSearchParams, name: string): DateRangeOption | undefined {
    const value = search.get(name);
    if (value === null) {
        return undefined;
    }
    if (value.includes('--')) {
        const [from, to] = value.split('--').map((part) => part.trim());
        return {
            label: CustomDateRangeLabel,
            dateFrom: from === '' ? undefined : from,
            dateTo: to === '' ? undefined : to,
        };
    }
    return { label: value };
}

/**
 * A `samplingDate` that's a preset label without concrete dates yet — needs to
 * be resolved against the dataset's actual date range before it can be used to
 * build a SILO query.
 */
export function isUnresolvedSamplingDate(samplingDate: DateRangeOption): boolean {
    return (
        samplingDate.label !== CustomDateRangeLabel &&
        samplingDate.dateFrom === undefined &&
        samplingDate.dateTo === undefined
    );
}

/** A number in [0, 1], or `undefined` for a missing or invalid value. */
function parseProportion(value: string | undefined): number | undefined {
    if (value === undefined || value.trim() === '') {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : undefined;
}
