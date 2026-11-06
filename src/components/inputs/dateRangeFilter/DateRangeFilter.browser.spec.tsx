import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { DateRangeFilter } from './DateRangeFilter';
import { type DateRangeOption } from '../../../domain/dateRange';

const options = [
    { label: 'Last week', dateFrom: '2026-06-24', dateTo: '2026-06-30' },
    { label: 'Last month', dateFrom: '2026-06-01', dateTo: '2026-06-30' },
];

const custom = { label: 'Custom', dateFrom: '2026-05-03', dateTo: '2026-05-17' };

function renderFilter(value: DateRangeOption, onChange = vi.fn()) {
    const screen = render(<DateRangeFilter dateRangeOptions={options} value={value} onChange={onChange} />);
    const rerender = (newValue: DateRangeOption) =>
        screen.rerender(<DateRangeFilter dateRangeOptions={options} value={newValue} onChange={onChange} />);
    return { ...screen, rerender };
}

describe('DateRangeFilter', () => {
    it('shows the preset and its dates', async () => {
        const screen = renderFilter(options[1]);

        await expect.element(screen.getByRole('combobox')).toHaveValue('Last month');
        await expect.element(screen.getByPlaceholder('Date from')).toHaveValue('2026-06-01');
        await expect.element(screen.getByPlaceholder('Date to')).toHaveValue('2026-06-30');
    });

    it('shows "Custom" and the new dates when the value changes from a preset to a custom range', async () => {
        const screen = renderFilter(options[1]);
        await expect.element(screen.getByRole('combobox')).toHaveValue('Last month');

        screen.rerender(custom);

        await expect.element(screen.getByRole('combobox')).toHaveValue('Custom');
        await expect.element(screen.getByPlaceholder('Date from')).toHaveValue('2026-05-03');
    });

    it('shows a preset again when the value changes back to it', async () => {
        const screen = renderFilter(custom);
        await expect.element(screen.getByRole('combobox')).toHaveValue('Custom');

        screen.rerender(options[0]);

        await expect.element(screen.getByRole('combobox')).toHaveValue('Last week');
        expect(screen.getByRole('option', { name: 'Custom' }).elements()).toHaveLength(0);
    });

    it('reports the preset picked', async () => {
        const onChange = vi.fn();
        const screen = renderFilter(options[1], onChange);

        await screen.getByRole('combobox').selectOptions('Last week');
        expect(onChange).toHaveBeenLastCalledWith(options[0]);
    });

    it('reports a typed date as a custom range with the other date', async () => {
        const onChange = vi.fn();
        const screen = renderFilter(options[1], onChange);

        await screen.getByPlaceholder('Date to').fill('2026-06-20');
        await screen.getByPlaceholder('Date from').click();

        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange).toHaveBeenCalledWith({ label: 'Custom', dateFrom: '2026-06-01', dateTo: '2026-06-20' });
    });
});
