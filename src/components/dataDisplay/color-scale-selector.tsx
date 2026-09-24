import { type FC } from 'react';

import { formatProportion } from './formatProportion';
import { type GraphColor, singleGraphColorRGBByName } from '../shared/charts/colors';

export interface ColorScale {
    color: GraphColor;
    /**
     * How the opacity of the fill grows with the proportion: as its `root`-th root. 1 is linear; higher roots make small proportions
     * visible (wastewater proportions are mostly small), but also tint what is barely there.
     */
    root: number;
}

/** The range the root of a color scale can be set to. */
export const COLOR_SCALE_ROOT_RANGE = { min: 1, max: 4, step: 0.5 };

/** Proportions shown as swatches next to the root slider, so the effect of the root can be seen. */
const ROOT_EXAMPLE_PROPORTIONS = [0.001, 0.01, 0.1];

export interface ColorScaleSelectorProps {
    colorScale: ColorScale;
    setColorScale: (colorScale: ColorScale) => void;
}

export const ColorScaleRootSelector: FC<ColorScaleSelectorProps> = ({ colorScale, setColorScale }) => {
    return (
        <div className='flex items-center gap-3'>
            <input
                type='range'
                className='w-40 accent-neutral-600'
                aria-label='Color scale root'
                min={COLOR_SCALE_ROOT_RANGE.min}
                max={COLOR_SCALE_ROOT_RANGE.max}
                step={COLOR_SCALE_ROOT_RANGE.step}
                value={colorScale.root}
                onChange={(e) => setColorScale({ ...colorScale, root: Number(e.target.value) })}
            />
            <span className='w-6 text-sm tabular-nums'>{colorScale.root}</span>
            <div className='flex gap-1'>
                {ROOT_EXAMPLE_PROPORTIONS.map((proportion) => (
                    <div
                        key={proportion}
                        className='flex h-8 w-12 items-center justify-center border border-gray-200 text-xs'
                        style={{ backgroundColor: getColorWithinScale(proportion, colorScale) }}
                    >
                        {formatProportion(proportion, 1)}
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * The fill for a proportion: one hue, whose opacity goes from 0 at a proportion of 0 to 1 at a
 * proportion of 1, along the scale's root (see `ColorScale.root`). Grey for a value that could not
 * be measured.
 */
export const getColorWithinScale = (value: number | undefined, colorScale: ColorScale) => {
    if (value === undefined) {
        return 'lightgrey';
    }

    const opacity = Math.min(1, Math.max(0, value)) ** (1 / colorScale.root);

    return singleGraphColorRGBByName(colorScale.color, opacity);
};
