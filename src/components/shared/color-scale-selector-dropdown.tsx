import { type FC } from 'react';

import { ColorScaleSelector, type ColorScaleSelectorProps } from './color-scale-selector';
import { Dropdown } from './dropdown';

export type ColorScaleSelectorDropdownProps = ColorScaleSelectorProps;

export const ColorScaleSelectorDropdown: FC<ColorScaleSelectorDropdownProps> = ({ colorScale, setColorScale }) => {
    return (
        <div className='inline-flex w-20'>
            <Dropdown buttonTitle={`Color scale`} placement={'bottom-start'}>
                <ColorScaleSelector colorScale={colorScale} setColorScale={setColorScale} />
            </Dropdown>
        </div>
    );
};
