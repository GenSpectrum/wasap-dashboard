import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect } from 'vitest';
import { render } from 'vitest-browser-react';

import { AppHeader } from './AppHeader';
import { it } from '../../../test-extend';
import { setAppConfigForTesting } from '../../config/appConfig';
import { testConfig } from '../../pageState/wasap/wasapTestConfig';

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

    it('shows the title and the organism selector', async () => {
        const { getByText, getByLabelText } = renderHeader('/');

        await expect.element(getByText('Wastewater Dashboard')).toBeVisible();
        await expect.element(getByLabelText('Organism')).toBeVisible();
    });

    it('shows the mode tabs of the organism that is open', async () => {
        const { getByRole } = renderHeader('/wastewater/covid/manual');

        await expect.element(getByRole('link', { name: 'Manual' })).toBeVisible();
        await expect.element(getByRole('link', { name: 'Resistance Mutations' })).toBeVisible();
    });

    it('shows no mode tabs where no organism is open', async () => {
        const { getByRole } = renderHeader('/');

        expect(getByRole('navigation', { name: 'Analysis mode' }).elements()).toHaveLength(0);
    });
});
