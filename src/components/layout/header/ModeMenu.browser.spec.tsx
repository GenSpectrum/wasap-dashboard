import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { ModeMenu } from './ModeMenu';
import { setAppConfigForTesting } from '../../../config/appConfig';
import { it } from '../../../test/test-extend';
import { testConfig } from '../../../test/testConfig';

const DATASET_SEARCH = 'locationName=Basel&samplingDate=2024-01-01--2024-12-31&granularity=week';

function renderMenu(entry = `/wastewater/covid/manual?${DATASET_SEARCH}`) {
    return render(
        <MemoryRouter initialEntries={[entry]}>
            <Routes>
                <Route path='/wastewater/:organismPath/*' element={<ModeMenu />} />
                <Route path='/' element={<ModeMenu />} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('ModeMenu', () => {
    beforeEach(() => {
        setAppConfigForTesting({ organisms: [testConfig] });
    });

    it('names the page that is open, and is closed at first', async () => {
        const { getByRole } = renderMenu();

        await expect.element(getByRole('button', { name: 'Manual' })).toHaveAttribute('aria-expanded', 'false');
        expect(getByRole('navigation').elements()).toHaveLength(0);
    });

    it('names the overview and the about page', async () => {
        await expect.element(renderMenu('/wastewater/covid').getByRole('button', { name: 'Overview' })).toBeVisible();
        await expect
            .element(renderMenu('/wastewater/covid/about').getByRole('button', { name: 'About' }))
            .toBeVisible();
    });

    it('lists all pages in their groups when opened', async () => {
        const { getByRole } = renderMenu();

        await getByRole('button', { name: 'Manual' }).click();

        const links = getByRole('navigation', { name: 'Analysis mode' }).getByRole('link');
        expect(links.elements().map((link) => link.textContent)).toEqual([
            'Overview',
            'Explorer',
            'Resistance',
            'Untracked',
            'Manual',
            'About',
        ]);
        const mutationLinks = getByRole('group', { name: 'Mutations' }).getByRole('link');
        expect(mutationLinks.elements().map((link) => link.textContent)).toEqual(['Resistance', 'Untracked', 'Manual']);
        await expect.element(getByRole('link', { name: 'Manual' })).toHaveAttribute('aria-current', 'page');
    });

    it('links to the modes with the dataset filter', async () => {
        const { getByRole } = renderMenu();

        await getByRole('button', { name: 'Manual' }).click();

        const href = getByRole('link', { name: 'Explorer' }).element().getAttribute('href');
        expect(href).toBe(`/wastewater/covid/variant?${DATASET_SEARCH}`);
    });

    it('closes after picking a page, and names the new one', async () => {
        const { getByRole } = renderMenu();

        await getByRole('button', { name: 'Manual' }).click();
        await getByRole('link', { name: 'Resistance' }).click();

        await expect.element(getByRole('button', { name: 'Resistance' })).toHaveAttribute('aria-expanded', 'false');
        expect(getByRole('navigation').elements()).toHaveLength(0);
    });

    it('closes on Escape, with the focus back on the button', async () => {
        const { getByRole } = renderMenu();

        await getByRole('button', { name: 'Manual' }).click();
        (getByRole('link', { name: 'Resistance' }).element() as HTMLElement).focus();
        await userEvent.keyboard('{Escape}');

        expect(getByRole('navigation').elements()).toHaveLength(0);
        await expect.element(getByRole('button', { name: 'Manual' })).toHaveFocus();
    });

    it('points the button at the list only while it is open', async () => {
        const { getByRole } = renderMenu();
        const button = getByRole('button', { name: 'Manual' });

        await expect.element(button).not.toHaveAttribute('aria-controls');
        await button.click();

        const listId = button.element().getAttribute('aria-controls');
        expect(getByRole('navigation').element().id).toBe(listId);
    });

    it('is not there where no organism is open', async () => {
        const { getByRole } = renderMenu('/');

        expect(getByRole('button').elements()).toHaveLength(0);
    });
});
