import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect } from 'vitest';
import { render } from 'vitest-browser-react';

import { DefaultModeRedirect, EnabledModeRoute } from './wasapModeRoutes';
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
                    <Route index element={<DefaultModeRedirect config={config} />} />
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

    it('sends the bare organism URL to the first enabled mode', async () => {
        const { getByText, getByTestId } = renderRoutes('/wastewater/covid');

        await expect.element(getByText('Page of the manual mode')).toBeVisible();
        await expect.element(getByTestId('location')).toHaveTextContent('/wastewater/covid/manual');
    });

    it('sends the bare organism URL to the configured default mode', async () => {
        const { getByText, getByTestId } = renderRoutes('/wastewater/covid', {
            ...testConfig,
            defaultAnalysisMode: 'untracked',
        });

        await expect.element(getByText('Page of the untracked mode')).toBeVisible();
        await expect.element(getByTestId('location')).toHaveTextContent('/wastewater/covid/untracked');
    });

    it('keeps the search params when it redirects', async () => {
        const { getByText, getByTestId } = renderRoutes('/wastewater/covid?locationName=Basel&granularity=week');

        await expect.element(getByText('Page of the manual mode')).toBeVisible();
        await expect
            .element(getByTestId('location'))
            .toHaveTextContent('/wastewater/covid/manual?locationName=Basel&granularity=week');
    });

    it('sends a path that is not a mode to the default mode', async () => {
        const { getByText, getByTestId } = renderRoutes('/wastewater/covid/nonsense');

        await expect.element(getByText('Page of the manual mode')).toBeVisible();
        await expect.element(getByTestId('location')).toHaveTextContent('/wastewater/covid/manual');
    });

    it('sends the mode that is not enabled to the default mode', async () => {
        const { getByText, getByTestId } = renderRoutes('/wastewater/covid/covSpectrumCollection');

        await expect.element(getByText('Page of the manual mode')).toBeVisible();
        await expect.element(getByTestId('location')).toHaveTextContent('/wastewater/covid/manual');
    });

    it('says so when no mode is enabled at all', async () => {
        const noModes = {
            ...testConfig,
            manualAnalysisModeEnabled: undefined,
            variantAnalysisModeEnabled: undefined,
            resistanceAnalysisModeEnabled: undefined,
            untrackedAnalysisModeEnabled: undefined,
        } as WasapPageConfig;

        const { getByText } = renderRoutes('/wastewater/covid', noModes);

        await expect.element(getByText("No analysis mode is enabled for 'SARS-CoV-2'.")).toBeVisible();
    });
});
