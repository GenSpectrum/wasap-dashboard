import { type DateRangeOption } from '../../components/dateRangeFilter/dateRangeOption';

/**
 * Describes one filter input in the "filter dataset" panel, and — more
 * importantly for the standalone app — drives the URL <-> page-state mapping in
 * the `*FilterFromToUrl` helpers alongside this file. `WasapPageStateHandler`
 * builds a fixed list of these (`generateWasapFilterConfig`); the wasap panel
 * only ever produces `text` and `date` entries, but the other variants are kept
 * so the shared parsing helpers stay type-complete.
 *
 * (Extracted from the now-deleted `BaselineSelector` component — a dashboards
 * leftover whose type this was co-located with.)
 */

export type LocationFilterConfig = {
    locationFields: string[];
    placeholderText: string;
    label?: string;
};

export type DateRangeFilterConfig = {
    dateRangeOptions: () => DateRangeOption[];
    dateColumn: string;
    label?: string;
};

export type TextInputConfig = {
    lapisField: string;
    placeholderText?: string;
    label?: string;
};

export type NumberRangeFilterConfig = {
    lapisField: string;
    label?: string;
    sliderMin?: number;
    sliderMax?: number;
    sliderStep?: number;
};

export type AdvancedQueryFilterConfig = {
    allowedFields?: string[];
};

export type BaselineFilterConfig =
    | ({
          type: 'date';
      } & DateRangeFilterConfig)
    | ({ type: 'text' } & TextInputConfig)
    | ({ type: 'location' } & LocationFilterConfig)
    | ({ type: 'number' } & NumberRangeFilterConfig)
    | ({ type: 'advancedQuery' } & AdvancedQueryFilterConfig);
