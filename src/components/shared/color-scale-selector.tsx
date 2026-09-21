import { type FC } from 'react';

import { type GraphColor, singleGraphColorRGBByName } from './charts/colors';
import { MinMaxRangeSlider } from '../inputs/min-max-range-slider';
import { formatProportion } from './table/formatProportion';

export interface ColorScale {
    min: number;
    max: number;
    color: GraphColor;
}

export interface ColorScaleSelectorProps {
    colorScale: ColorScale;
    setColorScale: (colorScale: ColorScale) => void;
}

export const ColorScaleSelector: FC<ColorScaleSelectorProps> = ({ colorScale, setColorScale }) => {
    const colorDisplayCss = `w-10 h-8 border border-gray-200 mx-2 text-xs flex items-center justify-center`;

    return (
        <div className='flex items-center'>
            <div
                style={{
                    backgroundColor: singleGraphColorRGBByName(colorScale.color, 0),
                    color: 'black',
                }}
                className={colorDisplayCss}
            >
                {formatProportion(colorScale.min, 0)}
            </div>
            <div className='w-64'>
                <MinMaxRangeSlider
                    min={colorScale.min * 100}
                    max={colorScale.max * 100}
                    setMin={(percentage) => {
                        setColorScale({ ...colorScale, min: percentage / 100 });
                    }}
                    setMax={(percentage) => {
                        setColorScale({ ...colorScale, max: percentage / 100 });
                    }}
                />
            </div>
            <div
                style={{
                    backgroundColor: singleGraphColorRGBByName(colorScale.color, 1),
                    color: 'white',
                }}
                className={colorDisplayCss}
            >
                {formatProportion(colorScale.max, 0)}
            </div>
        </div>
    );
};

/**
 * How the opacity of the fill grows with the proportion, as a power of where the proportion is
 * between the scale's min and max. The fourth root keeps low proportions visible without flattening
 * the high ones: wastewater proportions are mostly small, and a linear ramp would leave them nearly
 * transparent. For example, a proportion at 1% of the scale's maximum still gets an opacity of ~0.32.
 */
const RAMP_EXPONENT = 0.25;

/**
 * The fill for a proportion: one hue, whose opacity goes from 0 at the scale's min to 1 at its max
 * (and stays there above it) along the ramp above. Grey for a value that could not be measured.
 */
export const getColorWithinScale = (value: number | undefined, colorScale: ColorScale) => {
    if (value === undefined) {
        return 'lightgrey';
    }

    const colorRange = colorScale.max - colorScale.min;
    const position = colorRange === 0 ? (value >= colorScale.max ? 1 : 0) : (value - colorScale.min) / colorRange;
    const opacity = Math.min(1, Math.max(0, position)) ** RAMP_EXPONENT;

    return singleGraphColorRGBByName(colorScale.color, opacity);
};
