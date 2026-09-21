import { type FC } from 'react';

import { type BandViewSettings, MAX_BAND_THICKNESS, MIN_BAND_THICKNESS } from './band-view-settings';
import { ColorScaleSelector } from './color-scale-selector';
import { Dropdown } from './dropdown';

export interface ViewSettingsDropdownProps {
    settings: BandViewSettings;
    onChange: (settings: BandViewSettings) => void;
}

/**
 * An icon button that opens the settings for how the over-time data is displayed.
 */
export const ViewSettingsDropdown: FC<ViewSettingsDropdownProps> = ({ settings, onChange }) => {
    return (
        <div className='inline-flex'>
            <Dropdown buttonTitle='View settings' icon={<span className='iconify mdi--eye' />} placement='top-end'>
                <div className='flex flex-col gap-4'>
                    <div className='flex flex-col gap-2'>
                        <div className='text-sm font-semibold'>Color scale</div>
                        <ColorScaleSelector
                            colorScale={settings.colorScale}
                            setColorScale={(colorScale) => onChange({ ...settings, colorScale })}
                        />
                    </div>
                    <div className='flex flex-col gap-1'>
                        <div className='flex justify-between text-sm'>
                            <span className='font-semibold'>Band thickness</span>
                            <span>{settings.thickness}px</span>
                        </div>
                        <input
                            type='range'
                            className='accent-primary w-full'
                            aria-label='Band thickness'
                            min={MIN_BAND_THICKNESS}
                            max={MAX_BAND_THICKNESS}
                            step={1}
                            value={settings.thickness}
                            onChange={(e) => onChange({ ...settings, thickness: Number(e.target.value) })}
                        />
                    </div>
                    <label className='flex cursor-pointer items-center gap-2 text-sm font-semibold'>
                        <input
                            type='checkbox'
                            className='toggle toggle-primary toggle-sm'
                            checked={settings.showPercentages}
                            onChange={(e) => onChange({ ...settings, showPercentages: e.target.checked })}
                        />
                        Show percentages
                    </label>
                </div>
            </Dropdown>
        </div>
    );
};
