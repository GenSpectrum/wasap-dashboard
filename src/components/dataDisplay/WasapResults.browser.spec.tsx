import { describe, expect } from 'vitest';
import { render } from 'vitest-browser-react';

import { WasapResults } from './WasapResults';
import { it } from '../../../test-extend';

const ERROR_TEXT = 'Oops! Something went wrong.';

describe('WasapResults', () => {
    it('shows that it is loading, not an error, while the data is not there yet', async () => {
        const { getByLabelText, getByText } = render(
            <WasapResults data={undefined} error={null} isPending={true}>
                {() => <div>Results</div>}
            </WasapResults>,
        );

        await expect.element(getByLabelText('Loading')).toBeVisible();
        expect(getByText(ERROR_TEXT).elements()).toHaveLength(0);
    });

    it('shows the error once fetching the data has failed', async () => {
        const { getByText } = render(
            <WasapResults data={undefined} error={new Error('Backend not reachable')} isPending={false}>
                {() => <div>Results</div>}
            </WasapResults>,
        );

        await expect.element(getByText(ERROR_TEXT)).toBeVisible();
    });
});
