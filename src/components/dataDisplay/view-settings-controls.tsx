import { type FC } from 'react';

import { type BandViewSettings } from './band-view-settings';
import { ColorScaleRootSelector } from './color-scale-selector';
import { Dropdown } from './dropdown';

export interface ViewSettingsControlsProps {
    settings: BandViewSettings;
    onChange: (settings: BandViewSettings) => void;
}

/**
 * The icon buttons for how the over-time data is displayed: one that toggles the percentages
 * printed over the bands, and one that opens the contrast of the color scale.
 */
export const ViewSettingsControls: FC<ViewSettingsControlsProps> = ({ settings, onChange }) => {
    return (
        <div className='flex items-center gap-1'>
            <button
                type='button'
                className={`btn btn-xs ${settings.showPercentages ? 'border-neutral-600 bg-neutral-600 text-white' : ''}`}
                aria-label='Show percentages'
                title='Show percentages'
                aria-pressed={settings.showPercentages}
                onClick={() => onChange({ ...settings, showPercentages: !settings.showPercentages })}
            >
                <span className='iconify mdi--percent' />
            </button>
            <Dropdown
                buttonTitle='Contrast for small proportions'
                icon={<span className='iconify mdi--gradient-horizontal' />}
                placement='top-start'
            >
                <div className='flex flex-col gap-2'>
                    <div className='text-sm font-semibold'>Contrast for small proportions</div>
                    <ColorScaleRootSelector
                        colorScale={settings.colorScale}
                        setColorScale={(colorScale) => onChange({ ...settings, colorScale })}
                    />
                </div>
            </Dropdown>
        </div>
    );
};
