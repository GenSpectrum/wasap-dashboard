import { type ColorScale } from './color-scale-selector';

/** How the bands are drawn, as opposed to which data they show. */
export type BandViewSettings = {
    colorScale: ColorScale;
    /** Print the proportion of each bucket over the band. */
    showPercentages: boolean;
};

export const DEFAULT_BAND_VIEW_SETTINGS: BandViewSettings = {
    colorScale: { min: 0, max: 1, color: 'indigo' },
    showPercentages: false,
};
