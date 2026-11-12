import { MemoryRouter } from 'react-router-dom';
import { describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ModePageLayout } from './ModePageLayout';
import { it } from '../../test/test-extend';

// The dataset filter needs the organism and RhyDB; the layout only places it.
/* eslint-disable @typescript-eslint/naming-convention -- the names of the mocked components */
vi.mock('./DatasetFilterPanel', () => ({ DatasetFilterPanel: () => <div>The dataset filter</div> }));
vi.mock('./OrganismLayout', () => ({
    useOrganismLayoutContext: () => ({ dataset: undefined, onDatasetChange: () => {} }),
}));
/* eslint-enable @typescript-eslint/naming-convention */

describe('ModePageLayout', () => {
    it('heads the page with the full title of the mode', async () => {
        const { getByRole } = render(
            <MemoryRouter>
                <ModePageLayout mode='deconvolution' sidebar={<div>The filter</div>}>
                    <div>The results</div>
                </ModePageLayout>
            </MemoryRouter>,
        );

        await expect.element(getByRole('heading', { level: 1 })).toHaveTextContent('Lineage Prevalence');
    });
});
