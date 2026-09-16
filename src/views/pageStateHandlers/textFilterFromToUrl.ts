import type { BaselineFilterConfig } from './baselineFilterConfig';
import { getStringFromSearch } from '../helpers';

export function parseTextFiltersFromUrl(
    search: URLSearchParams | Map<string, string>,
    baselineFilterConfigs: BaselineFilterConfig[] | undefined,
) {
    return (
        baselineFilterConfigs?.reduce<Record<string, string | undefined>>((acc, config) => {
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
