import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ModeRoute } from './OrganismRoute';
import { it } from '../../test-extend';
import type { OrganismConfig } from '../config/organismConfig';
import { testConfig } from '../pageState/testConfig';

// the real pages need RhyDB; stand-ins that say which page it is are enough here
/* eslint-disable @typescript-eslint/naming-convention -- the names of the mocked components */
vi.mock('../components/modes/manual/ManualPage', () => ({ ManualPage: () => <ModePage mode='manual' /> }));
vi.mock('../components/modes/variantExplorer/VariantExplorerPage', () => ({
    VariantExplorerPage: () => <ModePage mode='variant' />,
}));
vi.mock('../components/modes/resistance/ResistancePage', () => ({
    ResistancePage: () => <ModePage mode='resistance' />,
}));
vi.mock('../components/modes/untracked/UntrackedPage', () => ({
    UntrackedPage: () => <ModePage mode='untracked' />,
}));
vi.mock('../components/modes/collection/CollectionPage', () => ({
    CollectionPage: () => <ModePage mode='collection' />,
}));
vi.mock('../components/modes/deconvolution/DeconvolutionPage', () => ({
    DeconvolutionPage: () => <ModePage mode='deconvolution' />,
}));
/* eslint-enable @typescript-eslint/naming-convention */

function ModePage({ mode }: { mode: string }) {
    return <div>{`Page of the ${mode} mode`}</div>;
}

function CurrentLocation() {
    const { pathname, search } = useLocation();
    return <div data-testid='location'>{`${pathname}${search}`}</div>;
}

function renderRoutes(entry: string, config: OrganismConfig = testConfig) {
    return render(
        <MemoryRouter initialEntries={[entry]}>
            <CurrentLocation />
            <Routes>
                <Route path='/wastewater/covid' element={<Outlet context={{ config }} />}>
                    <Route index element={<div>The overview page</div>} />
                    <Route path=':mode' element={<ModeRoute />} />
                </Route>
            </Routes>
        </MemoryRouter>,
    );
}

describe('the routes of the analysis modes', () => {
    it('shows the page of the mode in the path', async () => {
        const { getByText, getByTestId } = renderRoutes('/wastewater/covid/resistance');

        await expect.element(getByText('Page of the resistance mode')).toBeVisible();
        await expect.element(getByTestId('location')).toHaveTextContent('/wastewater/covid/resistance');
    });

    it('knows the variant mode as variantExplorer', async () => {
        const { getByText } = renderRoutes('/wastewater/covid/variantExplorer');

        await expect.element(getByText('Page of the variant mode')).toBeVisible();
    });

    it('shows the overview page on the bare organism URL', async () => {
        const { getByText, getByTestId } = renderRoutes('/wastewater/covid');

        await expect.element(getByText('The overview page')).toBeVisible();
        await expect.element(getByTestId('location')).toHaveTextContent('/wastewater/covid');
    });

    it('shows a 404 for a path that is not a mode segment', async () => {
        const { getByText } = renderRoutes('/wastewater/covid/nonsense');

        await expect.element(getByText('Page not found')).toBeVisible();
    });

    it('shows a 404 for a mode that is not enabled here', async () => {
        // 'collection' is a real mode, just not one testConfig enables.
        const { getByText } = renderRoutes('/wastewater/covid/collection');

        await expect.element(getByText('Page not found')).toBeVisible();
    });
});
