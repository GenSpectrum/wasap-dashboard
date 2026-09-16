/**
 * Describes one filter input in the "filter dataset" panel, and — more
 * importantly for the standalone app — drives the URL <-> page-state mapping in
 * `textFilterFromToUrl.ts` alongside this file. `WasapPageStateHandler` builds
 * a fixed list of these (`generateWasapFilterConfig`).
 *
 * (Extracted from the now-deleted `BaselineSelector` component — a dashboards
 * leftover whose type this was co-located with. That component also had
 * `'date'`/`'location'`/`'number'`/`'advancedQuery'` filter variants; those are
 * gone too — `samplingDate` now has its own dedicated URL parsing in
 * `WasapPageStateHandler`, and Wasap never used the others.)
 */

export type TextInputConfig = {
    lapisField: string;
    placeholderText?: string;
    label?: string;
};

export type BaselineFilterConfig = { type: 'text' } & TextInputConfig;
