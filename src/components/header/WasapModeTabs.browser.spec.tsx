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

    it('has a tab for each enabled mode', async () => {
        const { getByRole } = renderTabs();

        const tabs = getByRole('navigation', { name: 'Analysis mode' }).getByRole('link');

        await expect.element(tabs.nth(0)).toHaveTextContent('Manual');
        await expect.element(tabs.nth(1)).toHaveTextContent('Variant Explorer');
        await expect.element(tabs.nth(2)).toHaveTextContent('Resistance Mutations');
        await expect.element(tabs.nth(3)).toHaveTextContent('Untracked Mutations');
        expect(tabs.elements()).toHaveLength(4);
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
