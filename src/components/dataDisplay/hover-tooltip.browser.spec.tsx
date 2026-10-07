import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { HoverTooltip } from './hover-tooltip';

describe('HoverTooltip', () => {
    it('renders the content only while hovered', async () => {
        const screen = render(
            <HoverTooltip content='The details'>
                <span>Label</span>
            </HoverTooltip>,
        );

        await expect.element(screen.getByText('Label')).toBeVisible();
        expect(screen.container.textContent).not.toContain('The details');

        await screen.getByText('Label').hover();
        await expect.element(screen.getByRole('tooltip')).toHaveTextContent('The details');

        await screen.getByText('Label').unhover();
        await expect.element(screen.getByRole('tooltip')).not.toBeInTheDocument();
    });

    it('opens on focus, and closes on Escape', async () => {
        const screen = render(
            <HoverTooltip content='The details' focusable>
                <span>Label</span>
            </HoverTooltip>,
        );

        await userEvent.tab();
        await expect.element(screen.getByRole('tooltip')).toHaveTextContent('The details');

        await userEvent.keyboard('{Escape}');
        await expect.element(screen.getByRole('tooltip')).not.toBeInTheDocument();
    });
});
