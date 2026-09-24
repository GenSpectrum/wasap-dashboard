import { describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ResistanceMutationsFilter } from './ResistanceMutationsFilter';
import { it } from '../../../../test-extend';
import type { WasapResistanceFilter } from '../../../pageState/wasap/wasapAnalysisFilter';

describe('ResistanceMutationsFilter', () => {
    const defaultPageState: WasapResistanceFilter = {
        mode: 'resistance',
        sequenceType: 'amino acid',
        resistanceSet: '3CLpro',
    };

    const resistanceSetNames = ['3CLpro', 'RdRp', 'Spike'];

    it('renders an option per resistance set with the current one checked', async () => {
        const mockSetPageState = vi.fn();

        const { getByLabelText } = render(
            <ResistanceMutationsFilter
                pageState={defaultPageState}
                setPageState={mockSetPageState}
                resistanceSetNames={resistanceSetNames}
            />,
        );

        await expect.element(getByLabelText('3CLpro')).toBeChecked();
        await expect.element(getByLabelText('RdRp')).not.toBeChecked();
        await expect.element(getByLabelText('Spike')).not.toBeChecked();
    });

    it('calls setPageState when clicking a different resistance set', async () => {
        const mockSetPageState = vi.fn();

        const { getByText } = render(
            <ResistanceMutationsFilter
                pageState={defaultPageState}
                setPageState={mockSetPageState}
                resistanceSetNames={resistanceSetNames}
            />,
        );

        await getByText('RdRp').click();

        expect(mockSetPageState).toHaveBeenCalledWith({
            ...defaultPageState,
            resistanceSet: 'RdRp',
        });
    });
});
