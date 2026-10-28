import { type DateRangeOption, CUSTOM_DATE_RANGE_LABEL } from '../domain/dateRange';

export const setSearchFromString = (
    search: URLSearchParams,
    name: string,
    value: string | undefined | null | string[],
) => {
    if (value !== null && value !== undefined && value !== '' && !Array.isArray(value)) {
        search.set(name, value);
    }
};

export const getStringFromSearch = (
    search: URLSearchParams | Map<string, string>,
    name: string,
): string | undefined => {
    return search.get(name) ?? undefined;
};

export const setSearchFromDateRange = (
    search: URLSearchParams,
    name: string,
    dateRange: DateRangeOption | undefined | null,
) => {
    if (dateRange !== null && dateRange !== undefined) {
        let serializedValue: string;
        if (dateRange.label === CUSTOM_DATE_RANGE_LABEL) {
            serializedValue = `${dateRange.dateFrom ?? ''}--${dateRange.dateTo ?? ''}`;
        } else {
            serializedValue = dateRange.label;
        }
        search.set(name, serializedValue);
    }
};
