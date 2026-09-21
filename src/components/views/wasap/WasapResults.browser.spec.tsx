import { describe, expect } from 'vitest';
import { render } from 'vitest-browser-react';

import { WasapResults } from './WasapResults';
import { it } from '../../../../test-extend';

const ERROR_TEXT = 'There was an error fetching the data to display.';

describe('WasapResults', () => {
    it('shows that it is loading, not an error, while the data is not there yet', async () => {
        const { getByLabelText, getByText } = render(
            <WasapResults page={{ data: undefined, isError: false, isPending: true }}>
                {() => <div>Results</div>}
            </WasapResults>,
        );

        await expect.element(getByLabelText('Loading')).toBeVisible();
        expect(getByText(ERROR_TEXT).elements()).toHaveLength(0);
    });

    it('shows the error once fetching the data has failed', async () => {
        const { getByText } = render(
            <WasapResults page={{ data: undefined, isError: true, isPending: false }}>
                {() => <div>Results</div>}
            </WasapResults>,
        );

        await expect.element(getByText(ERROR_TEXT)).toBeVisible();
    });

    it('shows the placeholder right away when there is nothing to load yet', async () => {
        const { getByText } = render(
            <WasapResults
                page={{ data: undefined, isError: false, isPending: true }}
                placeholder={<div>No variant selected</div>}
            >
                {() => <div>Results</div>}
            </WasapResults>,
        );

        await expect.element(getByText('No variant selected')).toBeVisible();
    });

    it('shows the placeholder instead of the error when the fetch has given up', async () => {
        const { getByText } = render(
            <WasapResults
                page={{ data: undefined, isError: true, isPending: false }}
                placeholder={<div>No variant selected</div>}
            >
                {() => <div>Results</div>}
            </WasapResults>,
        );

        await expect.element(getByText('No variant selected')).toBeVisible();
        expect(getByText(ERROR_TEXT).elements()).toHaveLength(0);
    });
});
