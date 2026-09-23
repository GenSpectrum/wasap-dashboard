import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect } from 'vitest';
import { render } from 'vitest-browser-react';

import { EnabledModeRoute } from './wasapModeRoutes';
import { it } from '../../test-extend';
import type { WasapPageConfig } from '../config/wasapPageConfig';
import { testConfig } from '../pageState/wasap/wasapTestConfig';

function CurrentLocation() {
    const { pathname, search } = useLocation();
    return <div data-testid='location'>{`${pathname}${search}`}</div>;
}

function renderRoutes(entry: string, config: WasapPageConfig = testConfig) {
    return render(
        <MemoryRouter initialEntries={[entry]}>
            <CurrentLocation />
            <Routes>
                <Route path='/wastewater/covid'>
                    <Route index element={<div>The overview page</div>} />
                    <Route path=':mode' element={<ModePage config={config} />} />
                </Route>
            </Routes>
        </MemoryRouter>,
    );
}

function ModePage({ config }: { config: WasapPageConfig }) {
    const segment = useLocation().pathname.split('/').pop();

    return (
        <EnabledModeRoute config={config} segment={segment}>
            {(mode) => <div>{`Page of the ${mode} mode`}</div>}
        </EnabledModeRoute>
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
