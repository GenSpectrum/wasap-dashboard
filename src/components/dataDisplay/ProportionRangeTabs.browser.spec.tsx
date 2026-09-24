import { describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ProportionRangeTabs } from './ProportionRangeTabs';
import { it } from '../../../test-extend';

describe('ProportionRangeTabs', () => {
    const counts = { low: 139, medium: 14, high: 11, all: 164 };

    it('shows every range with its count, and marks the selected one', async () => {
        const { getByRole } = render(<ProportionRangeTabs value='medium' counts={counts} onChange={vi.fn()} />);

        await expect.element(getByRole('button', { name: '< 1% mean proportion 139' })).toBeVisible();
        await expect
            .element(getByRole('button', { name: '1% to 99% mean proportion 14' }))
            .toHaveAttribute('aria-pressed', 'true');
        await expect
            .element(getByRole('button', { name: '> 99% mean proportion 11' }))
            .toHaveAttribute('aria-pressed', 'false');
        await expect.element(getByRole('button', { name: 'All 164' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows a placeholder instead of the counts while they are loading', async () => {
        const { getByRole } = render(<ProportionRangeTabs value='medium' counts={undefined} onChange={vi.fn()} />);

        await expect.element(getByRole('button', { name: 'All …' })).toBeVisible();
    });

    it('calls onChange with the range of the clicked tab', async () => {
        const onChange = vi.fn();
        const { getByRole } = render(<ProportionRangeTabs value='medium' counts={counts} onChange={onChange} />);

        await getByRole('button', { name: /^All/ }).click();

        expect(onChange).toHaveBeenCalledWith('all');
    });
});
