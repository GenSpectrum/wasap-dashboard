import { describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { MeanProportionField } from './MeanProportionField';
import { it } from '../../../test-extend';

describe('MeanProportionField', () => {
    it('renders the lower and upper value', async () => {
        const { getByLabelText } = render(
            <MeanProportionField value={{ lower: 0.1, upper: 0.9 }} onChange={vi.fn()} />,
        );

        await expect.element(getByLabelText('Lower mean proportion')).toHaveValue(0.1);
        await expect.element(getByLabelText('Upper mean proportion')).toHaveValue(0.9);
    });

    it('calls onChange with the new lower value, keeping the upper value', async () => {
        const mockOnChange = vi.fn();
        const { getByLabelText } = render(
            <MeanProportionField value={{ lower: 0.1, upper: 0.9 }} onChange={mockOnChange} />,
        );

        await getByLabelText('Lower mean proportion').fill('0.3');

        expect(mockOnChange).toHaveBeenCalledWith({ lower: 0.3, upper: 0.9 });
    });

    it('calls onChange with the new upper value, keeping the lower value', async () => {
        const mockOnChange = vi.fn();
        const { getByLabelText } = render(
            <MeanProportionField value={{ lower: 0.1, upper: 0.9 }} onChange={mockOnChange} />,
        );

        await getByLabelText('Upper mean proportion').fill('0.5');

        expect(mockOnChange).toHaveBeenCalledWith({ lower: 0.1, upper: 0.5 });
    });

    it('clamps typed values into the range 0 to 1', async () => {
        const mockOnChange = vi.fn();
        const { getByLabelText } = render(
            <MeanProportionField value={{ lower: 0.1, upper: 0.9 }} onChange={mockOnChange} />,
        );

        await getByLabelText('Upper mean proportion').fill('4');

        expect(mockOnChange).toHaveBeenCalledWith({ lower: 0.1, upper: 1 });
    });
});
