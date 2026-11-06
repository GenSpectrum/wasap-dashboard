import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect } from 'vitest';
import { render } from 'vitest-browser-react';

import { AppHeader } from './AppHeader';
import { setAppConfigForTesting } from '../../../config/appConfig';
import { it } from '../../../test/test-extend';
import { testConfig } from '../../../test/testConfig';

function renderHeader(entry: string) {
    return render(
        <MemoryRouter initialEntries={[entry]}>
            <Routes>
                <Route path='/' element={<AppHeader />} />
                <Route path='/wastewater/:organismPath/*' element={<AppHeader />} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('AppHeader', () => {
    beforeEach(() => {
        setAppConfigForTesting({ organisms: [testConfig] });
    });

    it('shows the organism selector', async () => {
        const { getByLabelText } = renderHeader('/');

        await expect.element(getByLabelText('Organism')).toBeVisible();
    });

    it('shows the mode tabs of the organism that is open', async () => {
        const { getByRole } = renderHeader('/wastewater/covid/manual');

        await expect.element(getByRole('link', { name: 'Manual' })).toBeVisible();
        await expect.element(getByRole('link', { name: 'Resistance' })).toBeVisible();
    });

    it('has the menu for a narrow page as well, naming the page that is open', async () => {
        const { getByRole } = renderHeader('/wastewater/covid/manual');

        // Which of the two shows is up to the CSS, which these tests don't load.
        await expect.element(getByRole('button', { name: 'Manual' })).toBeInTheDocument();
    });

    it('links to the about page of the organism that is open', async () => {
        const { getByRole } = renderHeader('/wastewater/covid/manual');

        const href = getByRole('link', { name: 'About' }).element().getAttribute('href');

        expect(href).toBe('/wastewater/covid/about');
    });

    it('links to the about page without an organism where no organism is open', async () => {
        const { getByRole } = renderHeader('/');

        const href = getByRole('link', { name: 'About' }).element().getAttribute('href');

        expect(href).toBe('/about');
    });

    it('shows no mode tabs where no organism is open', async () => {
        const { getByRole } = renderHeader('/');

        expect(getByRole('navigation', { name: 'Analysis mode' }).elements()).toHaveLength(0);
    });
});
