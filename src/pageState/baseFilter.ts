import { type BaseFilter, type DatasetFilter, type MeanProportion } from './analysisFilter';
import { enumParam, listParam } from './urlParams';
import { getStringFromSearch, setSearchFromDateRange, setSearchFromString } from './urlSearchParams';
import { type OrganismConfig } from '../config/organismConfig';
import {
    type DateRangeOption,
    CUSTOM_DATE_RANGE_LABEL,
    DEFAULT_RECENT_DAYS_LABEL,
    presetLabel,
} from '../domain/dateRange';
import { temporalGranularitySchema } from '../domain/temporal';

const granularityParam = enumParam(temporalGranularitySchema);

/** The URL params of the dataset filter, which are the same on the pages of all modes. */
const LOCATIONS_PARAM = 'locations';
const DATE_PARAM = 'date';
const GRANULARITY_PARAM = 'granularity';
const DEFAULT_GRANULARITY = 'day';

/**
 * Parsing and serializing of the settings that every analysis mode page has in
 * common (location, sampling date, granularity, ...), so that the page state
 * handlers of the individual modes don't have to repeat it.
 *
 * Only the mean proportion depends on the mode: its default is passed in.
 */
export function parseBaseFilter(
    search: URLSearchParams,
    config: Pick<OrganismConfig, 'defaultLocationName'>,
    defaultMeanProportion: MeanProportion,
): BaseFilter {
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
    config: Pick<OrganismConfig, 'defaultLocationName'>,
): DatasetFilter {
    const samplingDate = parseSamplingDateFromUrl(search);

    // An unrestricted date range at 'day' granularity can span more days than
    // mutations-over-time supports (it refuses past 200 columns, "Too many
    // dates"), so a bare URL defaults to a recent window instead. Users can
    // still pick "All times" explicitly from the date filter's dropdown.
    return {
        locationNames: parseLocationNames(search, config.defaultLocationName),
        samplingDate: samplingDate ?? DEFAULT_SAMPLING_DATE,
        granularity: granularityParam.parse(search.get(GRANULARITY_PARAM) ?? '')?.value ?? DEFAULT_GRANULARITY,
    };
}

const DEFAULT_SAMPLING_DATE: DateRangeOption = { label: DEFAULT_RECENT_DAYS_LABEL };

/**
 * Writes the base filter into `search`, which the analysis mode then adds its
 * own settings to.
 */
export function setBaseFilterSearchParams(
    search: URLSearchParams,
    base: BaseFilter,
    config: Pick<OrganismConfig, 'defaultLocationName'>,
    defaultMeanProportion: MeanProportion,
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
    dataset: DatasetFilter,
    config: Pick<OrganismConfig, 'defaultLocationName'>,
) {
    // Like the mode's settings, the dataset filter is only in the URL where it isn't the default.
    const locations = listParam.write(dataset.locationNames);
    if (locations !== config.defaultLocationName) {
        search.set(LOCATIONS_PARAM, locations);
    }
    // Presets (e.g. "Most recent 14 days") serialize as their short name (`14d`), so reloading
    // the URL re-resolves them against the dataset's current date range instead of
    // pinning stale dates (see useResolvedSamplingDate). Explicit custom ranges
    // still serialize as literal dates — setSearchFromDateRange already branches
    // on the label.
    if (dataset.samplingDate?.label !== DEFAULT_SAMPLING_DATE.label) {
        setSearchFromDateRange(search, DATE_PARAM, dataset.samplingDate);
    }
    if (dataset.granularity !== DEFAULT_GRANULARITY) {
        setSearchFromString(search, GRANULARITY_PARAM, dataset.granularity);
    }
}

/**
 * The search params to take along when going to the page of another mode: the
 * dataset filter, but not the mean proportion, which has a different default
 * in each mode.
 */
export function datasetFilterSearchParams(
    dataset: DatasetFilter,
    config: Pick<OrganismConfig, 'defaultLocationName'>,
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
    dataset: DatasetFilter,
    config: Pick<OrganismConfig, 'defaultLocationName'>,
): URLSearchParams {
    const datasetParams = [LOCATIONS_PARAM, DATE_PARAM, GRANULARITY_PARAM];

    const result = datasetFilterSearchParams(dataset, config);
    for (const [name, value] of search) {
        if (!datasetParams.includes(name)) {
            result.append(name, value);
        }
    }
    return result;
}

/**
 * The locations as one list param, like `Basel (BS)|Zürich (ZH)`. A URL without it means the
 * default location, so all locations — an empty selection — are written as an empty value.
 */
function parseLocationNames(search: URLSearchParams, defaultLocationName: string): string[] {
    const raw = search.get(LOCATIONS_PARAM);
    return raw === null ? [defaultLocationName] : (listParam.parse(raw)?.value ?? [defaultLocationName]);
}

/**
 * Parses the `date` URL param, which is either literal `dateFrom--dateTo`
 * dates or a preset's short name (e.g. `14d` for "Most recent 14 days", see
 * `presetToken`); anything else is `undefined`, the default. A preset has no
 * concrete dates yet: WASAP's presets are relative to the dataset's actual
 * latest sample date (which can lag behind today), not to today, so they can
 * only be resolved once that date range has been read from RhyDB. See
 * `useResolvedSamplingDate`, which does that resolution.
 */
function parseSamplingDateFromUrl(search: URLSearchParams): DateRangeOption | undefined {
    const value = search.get(DATE_PARAM);
    if (value === null) {
        return undefined;
    }
    if (value.includes('--')) {
        const [from, to] = value.split('--').map((part) => part.trim());
        return {
            label: CUSTOM_DATE_RANGE_LABEL,
            dateFrom: from === '' ? undefined : from,
            dateTo: to === '' ? undefined : to,
        };
    }
    const label = presetLabel(value);
    return label === undefined ? undefined : { label };
}

/**
 * A `samplingDate` that's a preset label without concrete dates yet — needs to
 * be resolved against the dataset's actual date range before it can be used to
 * build a RhyDB query.
 */
export function isUnresolvedSamplingDate(samplingDate: DateRangeOption): boolean {
    return (
        samplingDate.label !== CUSTOM_DATE_RANGE_LABEL &&
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
