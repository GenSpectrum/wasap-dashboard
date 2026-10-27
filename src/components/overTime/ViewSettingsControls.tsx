import { type FC } from 'react';

import { ColorScaleRootSelector } from './ColorScaleSelector';
import { type BandViewSettings } from './bandViewSettings';
import { Dropdown } from '../ui/Dropdown';
import { ToggleIconButton } from '../ui/ToggleIconButton';

export interface ViewSettingsControlsProps {
    settings: BandViewSettings;
    onChange: (settings: BandViewSettings) => void;
}

/**
 * The icon buttons for how the over-time data is displayed: one that opens the contrast of the color
 * scale, and ones that toggle the percentages printed over the bands and the empty dates.
 */
export const ViewSettingsControls: FC<ViewSettingsControlsProps> = ({ settings, onChange }) => {
    return (
        <div className='flex items-center gap-1'>
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
            <ToggleIconButton
                title='Show percentages'
                icon='mdi--percent'
                pressed={settings.showPercentages}
                onChange={(showPercentages) => onChange({ ...settings, showPercentages })}
            />
            <ToggleIconButton
                title='Show empty dates'
                icon='mdi--table-column-plus-after'
                pressed={settings.showEmptyDates}
                onChange={(showEmptyDates) => onChange({ ...settings, showEmptyDates })}
            />
        </div>
    );
};
