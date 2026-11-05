import { describe, expect } from 'vitest';
import { render } from 'vitest-browser-react';

import { LabeledField } from './LabeledField';
import { it } from '../../test/test-extend';

describe('LabeledField', () => {
    it('shows info on hover of the help button', async () => {
        const { getByLabelText, getByText } = render(
            <LabeledField label='Test Field' info={<div>This is helpful information</div>}>
                <input type='text' />
            </LabeledField>,
        );

        const infoButton = getByLabelText('Show information about Test Field');
        await expect.element(infoButton).toBeInTheDocument();
        await expect.element(getByText('This is helpful information')).not.toBeInTheDocument();

        await infoButton.hover();

        await expect.element(getByText('This is helpful information')).toBeVisible();
    });

    it('opens modal when the help button is clicked', async () => {
        const { getByLabelText, getByText } = render(
            <LabeledField label='Test Field' infoModal={<div>This is helpful information</div>}>
                <input type='text' />
            </LabeledField>,
        );

        const infoButton = getByLabelText('Show information about Test Field');
        await expect.element(infoButton).toBeInTheDocument();

        const getInfoTest = () => getByText('This is helpful information');

        await expect.element(getInfoTest()).not.toBeVisible();

        await infoButton.click();

        await expect.element(getInfoTest()).toBeVisible();
    });
});
