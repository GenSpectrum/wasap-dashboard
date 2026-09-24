import { describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { DEFAULT_BAND_VIEW_SETTINGS } from './band-view-settings';
import { ViewSettingsControls } from './view-settings-controls';
import { it } from '../../../test-extend';

describe('ViewSettingsControls', () => {
    it('toggles the percentages with a button, off by default', async () => {
        const onChange = vi.fn();
        const { getByRole } = render(
            <ViewSettingsControls settings={DEFAULT_BAND_VIEW_SETTINGS} onChange={onChange} />,
        );

        const toggle = getByRole('button', { name: 'Show percentages' });
        await expect.element(toggle).toHaveAttribute('aria-pressed', 'false');

        await toggle.click();

        expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_BAND_VIEW_SETTINGS, showPercentages: true });
    });

    it('shows the percentage toggle as pressed while the percentages are shown', async () => {
        const { getByRole } = render(
            <ViewSettingsControls
                settings={{ ...DEFAULT_BAND_VIEW_SETTINGS, showPercentages: true }}
                onChange={vi.fn()}
            />,
        );

        await expect.element(getByRole('button', { name: 'Show percentages' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('opens the contrast settings with a button', async () => {
        const { getByRole } = render(<ViewSettingsControls settings={DEFAULT_BAND_VIEW_SETTINGS} onChange={vi.fn()} />);

        // The stylesheet isn't loaded in tests, so check for the class that hides the panel.
        const isHidden = () => getByRole('slider', { name: 'Color scale root' }).element().closest('.hidden') !== null;

        expect(isHidden()).toBe(true);

        await getByRole('button', { name: 'Contrast for small proportions' }).click();

        expect(isHidden()).toBe(false);
    });

    it('offers a slider for the root of the color scale, at the square root by default', async () => {
        const onChange = vi.fn();
        const { getByRole, getByText } = render(
            <ViewSettingsControls settings={DEFAULT_BAND_VIEW_SETTINGS} onChange={onChange} />,
        );

        const slider = getByRole('slider', { name: 'Color scale root' });
        await expect.element(slider).toHaveValue('2');
        await expect.element(getByText('Square root')).toBeInTheDocument();

        await slider.fill('4');

        expect(onChange).toHaveBeenCalledWith({
            ...DEFAULT_BAND_VIEW_SETTINGS,
            colorScale: { ...DEFAULT_BAND_VIEW_SETTINGS.colorScale, root: 4 },
        });
    });
});
