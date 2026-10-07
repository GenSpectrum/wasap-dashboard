import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { DateRangeFilter } from './date-range-filter';
import { type DateRangeValue } from './dateRangeOption';

const options = [
    { label: 'Last week', dateFrom: '2026-06-24', dateTo: '2026-06-30' },
    { label: 'Last month', dateFrom: '2026-06-01', dateTo: '2026-06-30' },
];

function renderFilter(value: DateRangeValue, onDateRangeChange = vi.fn()) {
    const screen = render(
        <DateRangeFilter dateRangeOptions={options} value={value} onDateRangeChange={onDateRangeChange} />,
    );
    const rerender = (newValue: DateRangeValue) =>
        screen.rerender(
            <DateRangeFilter dateRangeOptions={options} value={newValue} onDateRangeChange={onDateRangeChange} />,
        );
    return { ...screen, rerender };
}

describe('DateRangeFilter', () => {
    it('shows "Custom" when the value changes from a preset to a custom range', async () => {
        const screen = renderFilter('Last month');
        await expect.element(screen.getByRole('combobox')).toHaveValue('Last month');

        screen.rerender({ dateFrom: '2026-05-03', dateTo: '2026-05-17' });

        await expect.element(screen.getByRole('combobox')).toHaveValue('Custom');
    });

    it('shows a preset again when the value changes back to it', async () => {
        const screen = renderFilter({ dateFrom: '2026-05-03', dateTo: '2026-05-17' });
        await expect.element(screen.getByRole('combobox')).toHaveValue('Custom');

        screen.rerender('Last week');

        await expect.element(screen.getByRole('combobox')).toHaveValue('Last week');
        expect(screen.getByRole('option', { name: 'Custom' }).elements()).toHaveLength(0);
    });

    it('reports the preset picked, and null when cleared', async () => {
        const onDateRangeChange = vi.fn();
        const screen = renderFilter('Last month', onDateRangeChange);

        await screen.getByRole('combobox').selectOptions('Last week');
        expect(onDateRangeChange).toHaveBeenLastCalledWith(options[0]);

        await screen.getByRole('button', { name: 'Clear' }).click();
        expect(onDateRangeChange).toHaveBeenLastCalledWith(null);
    });
});
