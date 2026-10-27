import { QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { describe, expect, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { UntrackedFilter } from './UntrackedFilter';
import type { LapisRouteMocker } from '../../../../routeMocker';
import { it } from '../../../../test-extend';
import type { WasapUntrackedFilter } from '../../../pageState/wasap/wasapAnalysisFilter';

const DUMMY_LAPIS_URL_2 = 'http://lapis2.dummy';

/** The lineage picker reads via TanStack Query; the app provides the client at its root. */
const renderWithQueryClient = (ui: ReactElement) =>
    render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe('UntrackedFilter - custom variants textarea', () => {
    const mockCladeLineageQueryResult = {
        isPending: false,
        isError: false,
        data: {},
    } as UseQueryResult<Record<string, string>>;

    const defaultPageState: WasapUntrackedFilter = {
        mode: 'untracked',
        sequenceType: 'nucleotide',
        excludeSet: 'custom',
        excludeVariants: [],
    };

    it('sets multiple variants when multiple are selected', async ({ routeMockers: { lapis } }) => {
        setupLapisMocks(lapis);
        const mockSetPageState = vi.fn();

        // The filter shows what it is given, so the page state has to change for a second pick to add to the first.
        function WithPageState() {
            const [pageState, setPageState] = useState(defaultPageState);
            return (
                <UntrackedFilter
                    pageState={pageState}
                    setPageState={(newPageState) => {
                        mockSetPageState(newPageState);
                        setPageState(newPageState);
                    }}
                    clinicalSequenceLapisBaseUrl={DUMMY_LAPIS_URL_2}
                    clinicalSequenceLapisLineageField='pangoLineage'
                    cladeLineageQueryResult={mockCladeLineageQueryResult}
                />
            );
        }
        const { getByRole } = renderWithQueryClient(<WithPageState />);

        const variantCombobox = await vi.waitFor(() => getByRole('combobox', { name: /variant/i }));

        await userEvent.click(variantCombobox);

        const option = await vi.waitFor(() => getByRole('option', { name: 'JN.1', exact: true }));
        await option.click();

        await vi.waitFor(() => {
            expect(mockSetPageState).toHaveBeenCalledWith({
                ...defaultPageState,
                excludeVariants: ['JN.1'],
            });
        });

        const option2 = await vi.waitFor(() => getByRole('option', { name: 'KP.2', exact: true }));
        await option2.click();

        await vi.waitFor(() => {
            expect(mockSetPageState).toHaveBeenCalledWith({
                ...defaultPageState,
                excludeVariants: ['JN.1', 'KP.2'],
            });
        });
    });
});

function setupLapisMocks(lapisRouteMocker: LapisRouteMocker) {
    lapisRouteMocker.mockLineageDefinition('pangoLineage', {
        'JN.1': { parents: ['BA.2'], aliases: [] },
        'KP.2': { parents: ['JN.1'], aliases: [] },
        'BA.2': { parents: ['B.1.1.529'], aliases: [] },
    });

    lapisRouteMocker.mockLineageDefinitionWithUrl(DUMMY_LAPIS_URL_2, 'pangoLineage', {
        'JN.1': { parents: ['BA.2'], aliases: [] },
        'KP.2': { parents: ['JN.1'], aliases: [] },
        'BA.2': { parents: ['B.1.1.529'], aliases: [] },
    });

    lapisRouteMocker.mockPostAggregatedWithUrl(
        DUMMY_LAPIS_URL_2,
        { fields: ['pangoLineage'] },
        {
            data: [
                { count: 688569, pangoLineage: 'B.1.1.7' },
                { count: 314323, pangoLineage: 'BA.1' },
                { count: 54887, pangoLineage: 'B.1' },
                { count: 25101, pangoLineage: 'B.1.1' },
                { count: 20322, pangoLineage: 'P.1' },
                { count: 20018, pangoLineage: 'KP.3.1.1' },
                { count: 11424, pangoLineage: 'D.2' },
                { count: 6916, pangoLineage: 'JN.1' },
                { count: 3197, pangoLineage: 'KP.2' },
                { count: 2191, pangoLineage: 'C.37' },
                { count: 1599, pangoLineage: 'KP.3' },
                { count: 1481, pangoLineage: 'P.1.15' },
                { count: 1364, pangoLineage: 'A' },
            ],
        },
    );
}
