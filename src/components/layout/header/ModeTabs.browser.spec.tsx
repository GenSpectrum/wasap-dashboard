import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect } from 'vitest';
import { render } from 'vitest-browser-react';

import { ModeTabs } from './ModeTabs';
import { setAppConfigForTesting } from '../../../config/appConfig';
import { it } from '../../../test/test-extend';
import {
    testConfig,
    testConfigWithCollection,
    testConfigWithCooccurrence,
    testConfigWithDeconvolution,
} from '../../../test/testConfig';

const DATASET_SEARCH = 'locationName=Basel&samplingDate=2024-01-01--2024-12-31&granularity=week';

function renderTabs(entry = `/wastewater/covid/manual?${DATASET_SEARCH}`) {
    return render(
        <MemoryRouter initialEntries={[entry]}>
            <Routes>
                <Route path='/wastewater/:organismPath/*' element={<ModeTabs />} />
                <Route path='/' element={<ModeTabs />} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('ModeTabs', () => {
    beforeEach(() => {
        setAppConfigForTesting({ organisms: [testConfig], lollipopServiceUrl: undefined });
    });

    it('has an overview tab, then a tab for each enabled mode', async () => {
        const { getByRole } = renderTabs();

        const tabs = getByRole('navigation', { name: 'Analysis mode' }).getByRole('link');

        await expect.element(tabs.nth(0)).toHaveTextContent('Overview');
        await expect.element(tabs.nth(1)).toHaveTextContent('Explorer');
        await expect.element(tabs.nth(2)).toHaveTextContent('Resistance');
        await expect.element(tabs.nth(3)).toHaveTextContent('Untracked');
        await expect.element(tabs.nth(4)).toHaveTextContent('Manual');
        expect(tabs.elements()).toHaveLength(5);
    });

    it('groups the tabs of the modes', async () => {
        const { getByRole } = renderTabs();

        const lineageTabs = getByRole('group', { name: 'Lineages' }).getByRole('link');
        const mutationTabs = getByRole('group', { name: 'Mutations' }).getByRole('link');

        expect(lineageTabs.elements().map((tab) => tab.textContent)).toEqual(['Explorer']);
        expect(mutationTabs.elements().map((tab) => tab.textContent)).toEqual(['Resistance', 'Untracked', 'Manual']);
    });

    it('leaves out a group without any enabled mode', async () => {
        setAppConfigForTesting({
            organisms: [{ ...testConfig, variantAnalysisModeEnabled: undefined }],
            lollipopServiceUrl: undefined,
        });
        const { getByRole } = renderTabs();

        await expect.element(getByRole('group', { name: 'Mutations' })).toBeVisible();
        expect(getByRole('group', { name: 'Lineages' }).elements()).toHaveLength(0);
    });

    it('has the Prevalence tab right after the overview', async () => {
        setAppConfigForTesting({
            organisms: [testConfigWithDeconvolution],
            lollipopServiceUrl: 'http://lollipop.test',
        });
        const { getByRole } = renderTabs();

        const tabs = getByRole('navigation', { name: 'Analysis mode' }).getByRole('link');

        await expect.element(tabs.nth(1)).toHaveTextContent('Prevalence');
        expect(tabs.nth(1).element().getAttribute('href')).toMatch(/^\/wastewater\/covid\/prevalence\?/);
    });

    it('has the Co-occurrence tab right after the Explorer tab', async () => {
        setAppConfigForTesting({ organisms: [testConfigWithCooccurrence] });
        const { getByRole } = renderTabs();

        const tabs = getByRole('navigation', { name: 'Analysis mode' }).getByRole('link');

        await expect.element(tabs.nth(1)).toHaveTextContent('Explorer');
        await expect.element(tabs.nth(2)).toHaveTextContent('Co-occurrence');
    });

    it('has the Co-occurrence tab in no group', async () => {
        setAppConfigForTesting({ organisms: [testConfigWithCooccurrence] });
        const { getByRole } = renderTabs();

        const lineageTabs = getByRole('group', { name: 'Lineages' }).getByRole('link');

        await expect.element(getByRole('link', { name: 'Co-occurrence' })).toBeVisible();
        expect(lineageTabs.elements().map((tab) => tab.textContent)).not.toContain('Co-occurrence');
    });

    it('leaves the Prevalence tab out without a LolliPop service', async () => {
        setAppConfigForTesting({ organisms: [testConfigWithDeconvolution] });
        const { getByRole } = renderTabs();

        const tabs = getByRole('navigation', { name: 'Analysis mode' }).getByRole('link');

        await expect.element(tabs.nth(1)).toHaveTextContent('Explorer');
        expect(tabs.elements().map((tab) => tab.textContent)).not.toContain('Prevalence');
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

        const href = getByRole('link', { name: 'Explorer' }).element().getAttribute('href');

        expect(href).toBe(`/wastewater/covid/variant?${DATASET_SEARCH}`);
    });

    it('marks the tab of the current mode', async () => {
        const { getByRole } = renderTabs(`/wastewater/covid/resistance?${DATASET_SEARCH}`);

        await expect.element(getByRole('link', { name: 'Resistance' })).toHaveAttribute('aria-current', 'page');
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
