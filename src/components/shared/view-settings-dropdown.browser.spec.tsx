import { describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { type ColorScale } from './color-scale-selector';
import { ViewSettingsDropdown } from './view-settings-dropdown';
import { it } from '../../../test-extend';

const colorScale: ColorScale = { min: 0, max: 1, color: 'indigo' };

describe('ViewSettingsDropdown', () => {
    it('shows an icon button that has an accessible name', async () => {
        const { getByRole } = render(<ViewSettingsDropdown colorScale={colorScale} setColorScale={vi.fn()} />);

        await expect.element(getByRole('button', { name: 'View settings' })).toBeVisible();
    });

    it('shows the color scale settings once opened', async () => {
        const { getByRole, getByText } = render(
            <ViewSettingsDropdown colorScale={colorScale} setColorScale={vi.fn()} />,
        );

        // The stylesheet isn't loaded in tests, so check for the class that hides the panel.
        const isHidden = () => getByText('Color scale').element().closest('.hidden') !== null;

        expect(isHidden()).toBe(true);

        await getByRole('button', { name: 'View settings' }).click();

        expect(isHidden()).toBe(false);
    });
});
