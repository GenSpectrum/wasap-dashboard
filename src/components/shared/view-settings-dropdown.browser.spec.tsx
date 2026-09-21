import { describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { DEFAULT_BAND_VIEW_SETTINGS } from './band-view-settings';
import { ViewSettingsDropdown } from './view-settings-dropdown';
import { it } from '../../../test-extend';

describe('ViewSettingsDropdown', () => {
    it('shows an icon button that has an accessible name', async () => {
        const { getByRole } = render(<ViewSettingsDropdown settings={DEFAULT_BAND_VIEW_SETTINGS} onChange={vi.fn()} />);

        await expect.element(getByRole('button', { name: 'View settings' })).toBeVisible();
    });

    it('shows the color scale settings once opened', async () => {
        const { getByRole, getByText } = render(
            <ViewSettingsDropdown settings={DEFAULT_BAND_VIEW_SETTINGS} onChange={vi.fn()} />,
        );

        // The stylesheet isn't loaded in tests, so check for the class that hides the panel.
        const isHidden = () => getByText('Color scale').element().closest('.hidden') !== null;

        expect(isHidden()).toBe(true);

        await getByRole('button', { name: 'View settings' }).click();

        expect(isHidden()).toBe(false);
    });

    it('offers a toggle for the percentages, off by default', async () => {
        const onChange = vi.fn();
        const { getByRole } = render(
            <ViewSettingsDropdown settings={DEFAULT_BAND_VIEW_SETTINGS} onChange={onChange} />,
        );

        const toggle = getByRole('checkbox', { name: 'Show percentages' });
        await expect.element(toggle).not.toBeChecked();

        await toggle.click();

        expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_BAND_VIEW_SETTINGS, showPercentages: true });
    });

    it('offers a slider for the thickness of the bands', async () => {
        const onChange = vi.fn();
        const { getByRole } = render(
            <ViewSettingsDropdown settings={DEFAULT_BAND_VIEW_SETTINGS} onChange={onChange} />,
        );

        const slider = getByRole('slider', { name: 'Band thickness' });
        await expect.element(slider).toHaveValue(String(DEFAULT_BAND_VIEW_SETTINGS.thickness));

        await slider.fill('44');

        expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_BAND_VIEW_SETTINGS, thickness: 44 });
    });
});
