import { describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { FilterSidebar } from './FilterSidebar';
import { it } from '../../../../test-extend';
import { ManualPageStateHandler } from '../../../pageState/wasap/handlers/ManualPageStateHandler';
import type { WasapBaseFilter, WasapManualFilter } from '../../../pageState/wasap/wasapAnalysisFilter';
import { testConfig } from '../../../pageState/wasap/wasapTestConfig';

const handler = new ManualPageStateHandler(testConfig);

const base: WasapBaseFilter = {
    locationName: 'Basel',
    samplingDate: { label: 'Most recent 90 days' },
    granularity: 'day',
    excludeEmpty: true,
    meanProportion: { lower: 0.05, upper: 0.95 },
};

const noMutations: WasapManualFilter = { mode: 'manual', sequenceType: 'nucleotide', mutations: undefined };

function renderSidebar(analysis: WasapManualFilter = noMutations, appliedBase: WasapBaseFilter = base) {
    const setPageState = vi.fn();
    const screen = render(
        <FilterSidebar pageStateHandler={handler} base={appliedBase} analysis={analysis} setPageState={setPageState}>
            {(draft, setDraft) => (
                <button type='button' onClick={() => setDraft({ ...draft, mutations: ['A1T'] })}>
                    Pick a mutation
                </button>
            )}
        </FilterSidebar>,
    );
    return { ...screen, setPageState };
}

describe('FilterSidebar', () => {
    it('shows the filter of the mode and the mean proportion', async () => {
        const { getByRole, getByText } = renderSidebar();

        await expect.element(getByRole('button', { name: 'Pick a mutation' })).toBeVisible();
        await expect.element(getByText('Mean proportion', { exact: true })).toBeVisible();
    });

    it('applies nothing before the button is clicked', async () => {
        const { getByRole, setPageState } = renderSidebar();

        await getByRole('button', { name: 'Pick a mutation' }).click();

        expect(setPageState).not.toHaveBeenCalled();
    });

    it('applies the edited filter of the mode together with the applied base filter', async () => {
        const { getByRole, setPageState } = renderSidebar();

        await getByRole('button', { name: 'Pick a mutation' }).click();
        await getByRole('button', { name: 'Apply filters' }).click();

        expect(setPageState).toHaveBeenCalledWith({
            base: { ...base, meanProportion: { lower: 0, upper: 1 } },
            analysis: { ...noMutations, mutations: ['A1T'] },
        });
    });

    it('lets the mean proportion follow the default of the mode until it is touched', async () => {
        // Manual mode defaults to 0.05 to 0.95 without mutations, and to 0 to 1 with mutations.
        const { getByRole, getByLabelText } = renderSidebar();

        await expect.element(getByLabelText('Lower mean proportion')).toHaveValue(0.05);

        await getByRole('button', { name: 'Pick a mutation' }).click();

        await expect.element(getByLabelText('Lower mean proportion')).toHaveValue(0);
    });

    it('keeps a mean proportion that was applied before', async () => {
        const { getByRole, setPageState } = renderSidebar(noMutations, {
            ...base,
            meanProportion: { lower: 0.3, upper: 0.6 },
        });

        await getByRole('button', { name: 'Pick a mutation' }).click();
        await getByRole('button', { name: 'Apply filters' }).click();

        expect(setPageState).toHaveBeenCalledWith(
            expect.objectContaining({ base: expect.objectContaining({ meanProportion: { lower: 0.3, upper: 0.6 } }) }),
        );
    });
});
