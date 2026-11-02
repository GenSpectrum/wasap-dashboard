import { describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { NumericInput, stepValue } from './NumericInput';
import { it } from '../../test/test-extend';

describe('NumericInput', () => {
    it('renders with initial value', async () => {
        const mockOnChange = vi.fn();

        const { getByRole } = render(
            <NumericInput label='Test Input' value={5} min={0} max={10} step={1} onChange={mockOnChange} />,
        );

        const numberInput = getByRole('spinbutton');
        await expect.element(numberInput).toHaveValue(5);
    });

    it('calls onChange when number input changes', async () => {
        const mockOnChange = vi.fn();

        const { getByRole } = render(
            <NumericInput label='Test Input' value={5} min={0} max={10} step={1} onChange={mockOnChange} />,
        );

        const numberInput = getByRole('spinbutton');
        await numberInput.fill('7');

        expect(mockOnChange).toHaveBeenCalledWith(7);
    });

    it('calls onChange when range slider changes', async () => {
        const mockOnChange = vi.fn();

        const { getByRole } = render(
            <NumericInput label='Test Input' value={5} min={0} max={10} step={1} onChange={mockOnChange} />,
        );

        const slider = getByRole('slider');
        await slider.fill('8');

        expect(mockOnChange).toHaveBeenCalledWith(8);
    });

    it('steps the value with the step buttons', async () => {
        const mockOnChange = vi.fn();

        const { getByRole } = render(
            <NumericInput label='Test Input' value={0.75} min={0} max={1} step={0.01} onChange={mockOnChange} />,
        );

        await getByRole('button', { name: 'Increase Test Input' }).click();
        expect(mockOnChange).toHaveBeenLastCalledWith(0.76);

        await getByRole('button', { name: 'Decrease Test Input' }).click();
        expect(mockOnChange).toHaveBeenLastCalledWith(0.74);
    });
});

describe('stepValue', () => {
    it('steps onto the step grid without floating point noise', () => {
        expect(stepValue(0.7, 1, { min: 0, max: 1, step: 0.1 })).toBe(0.8);
        expect(stepValue(0.75, 1, { min: 0, max: 2, step: 0.05 })).toBe(0.8);
        expect(stepValue(0.123, 1, { min: 0, max: 1, step: 0.01 })).toBe(0.13);
    });

    it('stays within min and max', () => {
        expect(stepValue(1, 1, { min: 0, max: 1, step: 0.01 })).toBe(1);
        expect(stepValue(1, -1, { min: 1, max: 250, step: 1 })).toBe(1);
    });
});
