import { MemoryRouter } from 'react-router-dom';
import { describe, expect } from 'vitest';
import { render } from 'vitest-browser-react';

import { WasapModeTabs } from './WasapModeTabs';
import { it } from '../../../../test-extend';
import type { WasapBaseFilter } from '../../../pageState/wasap/wasapAnalysisFilter';
import { testConfig, testConfigWithCollection } from '../../../pageState/wasap/wasapTestConfig';

const base: WasapBaseFilter = {
    locationName: 'Basel',
    samplingDate: { label: 'Custom', dateFrom: '2024-01-01', dateTo: '2024-12-31' },
    granularity: 'week',
    excludeEmpty: false,
    meanProportion: { lower: 0.3, upper: 0.6 },
};

function renderTabs(entry = '/wastewater/covid/manual', config = testConfig) {
    return render(
        <MemoryRouter initialEntries={[entry]}>
            <WasapModeTabs config={config} dataset={base} />
        </MemoryRouter>,
    );
}

describe('WasapModeTabs', () => {
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
        const { getByRole } = renderTabs('/wastewater/covid/manual', testConfigWithCollection);

        await expect.element(getByRole('link', { name: 'CovSpectrum Collection' })).toBeVisible();
    });

    it('links to the page of the mode, with the dataset filter but without the mean proportion', async () => {
        const { getByRole } = renderTabs();

        const href = getByRole('link', { name: 'Variant Explorer' }).element().getAttribute('href');

        expect(href).toBe(
            '/wastewater/covid/variantExplorer?locationName=Basel&samplingDate=2024-01-01--2024-12-31&granularity=week&excludeEmpty=false',
        );
    });

    it('marks the tab of the current mode', async () => {
        const { getByRole } = renderTabs('/wastewater/covid/resistance');

        await expect
            .element(getByRole('link', { name: 'Resistance Mutations' }))
            .toHaveAttribute('aria-current', 'page');
        await expect.element(getByRole('link', { name: 'Manual' })).not.toHaveAttribute('aria-current');
    });
});
