import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect } from 'vitest';
import { render } from 'vitest-browser-react';

import { WasapModeTabs } from './WasapModeTabs';
import { it } from '../../../test-extend';
import { setAppConfigForTesting } from '../../config/appConfig';
import { testConfig, testConfigWithCollection } from '../../pageState/wasap/wasapTestConfig';

const DATASET_SEARCH = 'locationName=Basel&samplingDate=2024-01-01--2024-12-31&granularity=week&excludeEmpty=false';

function renderTabs(entry = `/wastewater/covid/manual?${DATASET_SEARCH}`) {
    return render(
        <MemoryRouter initialEntries={[entry]}>
            <Routes>
                <Route path='/wastewater/:organismPath/*' element={<WasapModeTabs />} />
                <Route path='/' element={<WasapModeTabs />} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('WasapModeTabs', () => {
    beforeEach(() => {
        setAppConfigForTesting({ organisms: [testConfig] });
    });

    it('has an overview tab, then a tab for each enabled mode', async () => {
        const { getByRole } = renderTabs();

        const tabs = getByRole('navigation', { name: 'Analysis mode' }).getByRole('link');

        await expect.element(tabs.nth(0)).toHaveTextContent('Overview');
        await expect.element(tabs.nth(1)).toHaveTextContent('Manual');
        await expect.element(tabs.nth(2)).toHaveTextContent('Variant Explorer');
        await expect.element(tabs.nth(3)).toHaveTextContent('Resistance Mutations');
        await expect.element(tabs.nth(4)).toHaveTextContent('Untracked Mutations');
        expect(tabs.elements()).toHaveLength(5);
    });

    it('links the overview tab to the bare organism URL, with no search params', async () => {
        const { getByRole } = renderTabs();

        const href = getByRole('link', { name: 'Overview' }).element().getAttribute('href');

        expect(href).toBe('/wastewater/covid');
    });

    it('has a tab for a mode that is enabled by the config only', async () => {
        setAppConfigForTesting({ organisms: [testConfigWithCollection] });
        const { getByRole } = renderTabs();

        await expect.element(getByRole('link', { name: 'Collection' })).toBeVisible();
    });

    it('links to the page of the mode, with the dataset filter but without the mean proportion', async () => {
        const { getByRole } = renderTabs(
            `/wastewater/covid/manual?${DATASET_SEARCH}&meanProportionLower=0.3&meanProportionUpper=0.6&sequenceType=amino+acid`,
        );

        const href = getByRole('link', { name: 'Variant Explorer' }).element().getAttribute('href');

        expect(href).toBe(`/wastewater/covid/variantExplorer?${DATASET_SEARCH}`);
    });

    it('marks the tab of the current mode', async () => {
        const { getByRole } = renderTabs(`/wastewater/covid/resistance?${DATASET_SEARCH}`);

        await expect
            .element(getByRole('link', { name: 'Resistance Mutations' }))
            .toHaveAttribute('aria-current', 'page');
        await expect.element(getByRole('link', { name: 'Manual' })).not.toHaveAttribute('aria-current');
        // Not the overview tab either: it only matches the bare organism URL exactly, not every path below it.
        await expect.element(getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
    });

    it('marks the overview tab on the bare organism URL', async () => {
        const { getByRole } = renderTabs('/wastewater/covid');

        await expect.element(getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    });

    it('has no tabs where no organism is open', async () => {
        const { getByRole } = renderTabs('/');

        expect(getByRole('navigation', { name: 'Analysis mode' }).elements()).toHaveLength(0);
    });

    it('has no tabs for an organism that does not exist', async () => {
        const { getByRole } = renderTabs('/wastewater/nonsense/manual');

        expect(getByRole('navigation', { name: 'Analysis mode' }).elements()).toHaveLength(0);
    });
});
