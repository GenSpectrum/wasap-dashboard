import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { DateRangeDropdown } from './DateRangeDropdown';
import { type DateRangeOption } from '../../../domain/dateRange';

const options = [
    { label: 'Last week', dateFrom: '2026-06-24', dateTo: '2026-06-30' },
    { label: 'Last month', dateFrom: '2026-06-01', dateTo: '2026-06-30' },
];

function renderDropdown(value: DateRangeOption | undefined, onChange = vi.fn()) {
    const screen = render(
        <>
            {/* Above: the calendar opens below, over whatever is there. */}
            <button type='button'>Elsewhere</button>
            <DateRangeDropdown dateRangeOptions={options} value={value} onChange={onChange} />
        </>,
    );
    return { ...screen, onChange, button: screen.getByRole('button', { name: /2026/ }) };
}

describe('DateRangeDropdown', () => {
    it('shows the dates of a preset given by its label alone', async () => {
        const screen = renderDropdown({ label: 'Last week' });

        await expect.element(screen.button).toHaveTextContent('Last week, Jun 24 – Jun 30, 2026');
    });

    it('applies both typed dates at once, when clicked away', async () => {
        const screen = renderDropdown({ label: 'Last month' });
        await screen.button.click();

        await screen.getByPlaceholder('Date from').fill('2026-06-03');
        await screen.getByPlaceholder('Date to').fill('2026-06-12');
        // The first date counts once the focus leaves it, but nothing is applied yet.
        await expect.element(screen.button).toHaveTextContent('Jun 3 – Jun 30, 2026 (28 days)');
        expect(screen.onChange).not.toHaveBeenCalled();

        await screen.getByRole('button', { name: 'Elsewhere' }).click();

        expect(screen.onChange).toHaveBeenCalledOnce();
        expect(screen.onChange).toHaveBeenCalledWith({ label: 'Custom', dateFrom: '2026-06-03', dateTo: '2026-06-12' });
        await expect.element(screen.getByPlaceholder('Date from')).not.toBeInTheDocument();
    });

    it('applies a day picked in the calendar on Escape', async () => {
        const screen = renderDropdown({ label: 'Last month' });
        await screen.button.click();

        await screen.getByPlaceholder('Date from').click();
        // The first of the two calendars, the one of "Date from".
        await screen.getByLabelText('June 10, 2026').first().click();
        await expect.element(screen.button).toHaveTextContent('Jun 10 – Jun 30, 2026 (21 days)');
        await userEvent.keyboard('{Escape}');

        expect(screen.onChange).toHaveBeenCalledOnce();
        expect(screen.onChange).toHaveBeenCalledWith({ label: 'Custom', dateFrom: '2026-06-10', dateTo: '2026-06-30' });
    });

    it('applies a preset picked', async () => {
        const screen = renderDropdown({ label: 'Last month' });
        await screen.button.click();

        await screen.getByRole('combobox').selectOptions('Last week');
        await screen.getByRole('button', { name: 'Elsewhere' }).click();

        expect(screen.onChange).toHaveBeenCalledOnce();
        expect(screen.onChange).toHaveBeenCalledWith(options[0]);
    });

    it('applies nothing if nothing changed', async () => {
        const screen = renderDropdown({ label: 'Last month' });
        await screen.button.click();
        await screen.getByRole('button', { name: 'Elsewhere' }).click();

        expect(screen.onChange).not.toHaveBeenCalled();
    });
});
