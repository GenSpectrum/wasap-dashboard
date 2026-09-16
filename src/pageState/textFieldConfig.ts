import { getStringFromSearch } from './urlSearchParams';

/**
 * Describes one text filter field, and drives the URL <-> page-state mapping
 * in `parseTextFiltersFromUrl` below. `WasapPageStateHandler` builds a fixed
 * list of these (`generateWasapFilterConfig`).
 *
 * (Extracted from the now-deleted `BaselineSelector` component — a dashboards
 * leftover whose type this was co-located with. That component also had
 * date/location/number/advanced-query filter variants; those are gone —
 * `samplingDate` now has its own dedicated URL parsing in
 * `WasapPageStateHandler`, and Wasap never used the others.)
 */
export type TextFieldConfig = {
    lapisField: string;
    placeholderText?: string;
    label?: string;
};

export function parseTextFiltersFromUrl(
    search: URLSearchParams | Map<string, string>,
    textFieldConfigs: TextFieldConfig[] | undefined,
) {
    return (
        textFieldConfigs?.reduce<Record<string, string | undefined>>((acc, config) => {
            const value = getStringFromSearch(search, config.lapisField);
            if (value === undefined) {
                return acc;
            }

            return {
                ...acc,
                [config.lapisField]: getStringFromSearch(search, config.lapisField),
            };
        }, {}) ?? {}
    );
}
