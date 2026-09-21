import { type ColorScale } from './color-scale-selector';

/** How the bands are drawn, as opposed to which data they show. */
export type BandViewSettings = {
    colorScale: ColorScale;
    /** Print the proportion of each bucket over the band. */
    showPercentages: boolean;
    /** Height, in pixels, of a band at its thickest bucket. The rows are as high as that needs. */
    thickness: number;
};

export const MIN_BAND_THICKNESS = 10;
export const MAX_BAND_THICKNESS = 60;

export const DEFAULT_BAND_VIEW_SETTINGS: BandViewSettings = {
    colorScale: { min: 0, max: 1, color: 'indigo' },
    showPercentages: false,
    thickness: 30,
};
