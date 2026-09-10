import { type FC } from 'react';
import { ColorScaleSelector, type ColorScaleSelectorProps } from './color-scale-selector';
import { Dropdown } from './dropdown';

export type ColorScaleSelectorDropdownProps = ColorScaleSelectorProps;

export const ColorScaleSelectorDropdown: FC<ColorScaleSelectorDropdownProps> = ({ colorScale, setColorScale }) => {
    return (
        <div className='w-20 inline-flex'>
            <Dropdown buttonTitle={`Color scale`} placement={'bottom-start'}>
                <ColorScaleSelector colorScale={colorScale} setColorScale={setColorScale} />
            </Dropdown>
        </div>
    );
};
