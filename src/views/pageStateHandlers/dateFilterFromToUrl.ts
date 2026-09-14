import { type DateRangeOption } from '../../components/dateRangeFilter/dateRangeOption';

import type { BaselineFilterConfig } from './baselineFilterConfig';
import { CustomDateRangeLabel } from '../../types/DateWindow';
import type { Dataset } from '../View';

// TODO: `parseDateRangesFromUrl`/`getDateRangeFromSearch` are dead — no
// `BaselineFilterConfig` of type 'date' is produced any more (WASAP's
// samplingDate has its own parsing in `WasapPageStateHandler` now). Left in
// place since `baselineFilterConfig.ts`'s 'date' variant still references
// this file's types; circle back and remove both together.
export function parseDateRangesFromUrl(
    search: URLSearchParams | Map<string, string>,
    baselineFilterConfigs: BaselineFilterConfig[] | undefined,
) {
    const dateRangeFilterConfigs = baselineFilterConfigs?.filter((config) => config.type === 'date');

    return (
        dateRangeFilterConfigs?.reduce<Record<string, DateRangeOption | undefined>>((acc, config) => {
            const dateRange = getDateRangeFromSearch(search, config.dateColumn, config.dateRangeOptions());
            if (dateRange === undefined) {
                return acc;
            }

            return {
                ...acc,
                [config.dateColumn]: dateRange,
            };
        }, {}) ?? {}
    );
}

export const getDateRangeFromSearch = (
    search: URLSearchParams | Map<string, string>,
    name: string,
    dateRangeOptions: DateRangeOption[],
): DateRangeOption | undefined => {
    const value = search.get(name);
    if (value === null || value === undefined) {
        return undefined;
    }
    const customDateRange = dateRangeOptions.find((option) => option.label === value);
    if (customDateRange !== undefined) {
        return customDateRange;
    }

    if (value.includes('--')) {
        const [from, to] = value.split('--');
        return {
            label: CustomDateRangeLabel,
            dateFrom: emptyToUndefined(from),
            dateTo: emptyToUndefined(to),
        };
    }
    return undefined;
};

function emptyToUndefined(value: string) {
    const trimmedValue = value.trim();
    return trimmedValue === '' ? undefined : trimmedValue;
}

export function setSearchFromDateFilters(
    search: URLSearchParams,
    pageState: Dataset,
    baselineFilterConfigs: BaselineFilterConfig[] | undefined,
) {
    const dateRangeFilterConfigs = baselineFilterConfigs?.filter((config) => config.type === 'date');

    dateRangeFilterConfigs?.forEach((config) => {
        const value = pageState.datasetFilter.dateFilters[config.dateColumn];
        setSearchFromDateRange(search, config.dateColumn, value);
    });
}

export const setSearchFromDateRange = (
    search: URLSearchParams,
    name: string,
    dateRange: DateRangeOption | undefined | null,
) => {
    if (dateRange !== null && dateRange !== undefined) {
        let serializedValue: string;
        if (dateRange.label === CustomDateRangeLabel) {
            serializedValue = `${dateRange.dateFrom ?? ''}--${dateRange.dateTo ?? ''}`;
        } else {
            serializedValue = dateRange.label;
        }
        search.set(name, serializedValue);
    }
};
