import { describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { SegmentedSelect } from './SegmentedSelect';
import { it } from '../../test/test-extend';

describe('SegmentedSelect', () => {
    const options = [
        { value: 0, label: '0%' },
        { value: 0.01, label: '1%' },
        { value: 0.1, label: '10%' },
    ];

    it('marks the option of the value as checked', async () => {
        const { getByLabelText } = render(
            <SegmentedSelect label='Min. share' value={0.01} options={options} onChange={vi.fn()} />,
        );

        await expect.element(getByLabelText('1%')).toBeChecked();
        await expect.element(getByLabelText('10%')).not.toBeChecked();
    });

    it('marks no option where the value is none of them', async () => {
        const { getByRole } = render(
            <SegmentedSelect label='Min. share' value={0.5} options={options} onChange={vi.fn()} />,
        );

        for (const radio of getByRole('radio').elements()) {
            expect(radio).not.toBeChecked();
        }
    });

    it('calls onChange with the value of the clicked option', async () => {
        const onChange = vi.fn();
        const { getByText } = render(
            <SegmentedSelect label='Min. share' value={0} options={options} onChange={onChange} />,
        );

        await getByText('10%').click();

        expect(onChange).toHaveBeenCalledWith(0.1);
    });
});
