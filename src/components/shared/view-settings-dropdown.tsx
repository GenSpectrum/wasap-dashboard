import { type FC } from 'react';

import { type ColorScale, ColorScaleSelector } from './color-scale-selector';
import { Dropdown } from './dropdown';

export interface ViewSettingsDropdownProps {
    colorScale: ColorScale;
    setColorScale: (colorScale: ColorScale) => void;
}

/**
 * An icon button that opens the settings for how the over-time data is displayed.
 */
export const ViewSettingsDropdown: FC<ViewSettingsDropdownProps> = ({ colorScale, setColorScale }) => {
    return (
        <div className='inline-flex'>
            <Dropdown buttonTitle='View settings' icon={<span className='iconify mdi--eye' />} placement='top-end'>
                <div className='flex flex-col gap-2'>
                    <div className='text-sm font-semibold'>Color scale</div>
                    <ColorScaleSelector colorScale={colorScale} setColorScale={setColorScale} />
                </div>
            </Dropdown>
        </div>
    );
};
