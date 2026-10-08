import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement } from 'react';
import { describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ManualAnalysisFilter } from './ManualAnalysisFilter';
import { DUMMY_SILO_URL } from '../../../../routeMocker';
import { it, siloRouteMocker } from '../../../../test-extend';
import { ConnectionProvider } from '../../../dataLayer/hooks/connection';
import type { SiloSchema } from '../../../dataLayer/queries/schema';
import type { WasapManualFilter } from '../../../pageState/wasap/wasapAnalysisFilter';

const schema: SiloSchema = {
    table: 'data',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

/** Renders inside a SILO connection whose reference genome has one 20,000 bp segment and one gene. */
function renderWithSilo(ui: ReactElement) {
    const sequence = 'ATGC'.repeat(5000);
    siloRouteMocker.mockReferenceGenome([
        { name: 'main', type: 'nucleotide', sequence },
        { name: 'S', type: 'amino_acid', sequence },
    ]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ConnectionProvider url={DUMMY_SILO_URL} schema={schema}>
                {ui}
            </ConnectionProvider>
        </QueryClientProvider>,
    );
}

describe('ManualAnalysisFilter', () => {
    const defaultPageState: WasapManualFilter = {
        mode: 'manual',
        sequenceType: 'nucleotide',
        mutations: undefined,
    };

    it('renders with nucleotide sequence type selected', async () => {
        const mockSetPageState = vi.fn();

        const { getByLabelText } = renderWithSilo(
            <ManualAnalysisFilter pageState={defaultPageState} setPageState={mockSetPageState} />,
        );

        const nucleotideRadio = getByLabelText('Nucleotide');
        await expect.element(nucleotideRadio).toBeChecked();
    });

    it('renders with amino acid sequence type selected', async () => {
        const mockSetPageState = vi.fn();
        const pageState: WasapManualFilter = {
            ...defaultPageState,
            sequenceType: 'amino acid',
        };

        const { getByLabelText } = renderWithSilo(
            <ManualAnalysisFilter pageState={pageState} setPageState={mockSetPageState} />,
        );

        const aminoAcidRadio = getByLabelText('Amino acid');
        await expect.element(aminoAcidRadio).toBeChecked();
    });

    it('clears mutations when changing sequence type', async () => {
        const mockSetPageState = vi.fn();
        const pageState: WasapManualFilter = {
            ...defaultPageState,
            sequenceType: 'nucleotide',
            mutations: ['A23T'],
        };

        const { getByLabelText } = renderWithSilo(
            <ManualAnalysisFilter pageState={pageState} setPageState={mockSetPageState} />,
        );

        const aminoAcidRadio = getByLabelText('Amino acid');
        await aminoAcidRadio.click();

        expect(mockSetPageState).toHaveBeenCalledWith({
            mode: 'manual',
            sequenceType: 'amino acid',
            mutations: undefined,
        });
    });

    it('does not call setPageState when clicking the already selected sequence type', async () => {
        const mockSetPageState = vi.fn();

        const { getByLabelText } = renderWithSilo(
            <ManualAnalysisFilter pageState={defaultPageState} setPageState={mockSetPageState} />,
        );

        const nucleotideRadio = getByLabelText('Nucleotide');
        await nucleotideRadio.click();

        expect(mockSetPageState).not.toHaveBeenCalled();
    });

    it('calls setPageState with nucleotide mutation when entering and confirming A23T', async () => {
        const mockSetPageState = vi.fn();

        const { getByRole } = renderWithSilo(
            <ManualAnalysisFilter pageState={defaultPageState} setPageState={mockSetPageState} />,
        );

        const mutationInput = getByRole('combobox');
        await mutationInput.fill('A23T');
        const option = await vi.waitFor(() => getByRole('option', { name: 'A23T', exact: true }));
        await option.click();

        await vi.waitFor(() => {
            expect(mockSetPageState).toHaveBeenCalledWith({
                ...defaultPageState,
                mutations: ['A23T'],
            });
        });
    });

    it('calls setPageState with amino acid mutation when in amino acid mode', async () => {
        const mockSetPageState = vi.fn();
        const pageState: WasapManualFilter = {
            ...defaultPageState,
            sequenceType: 'amino acid',
        };

        const { getByRole } = renderWithSilo(
            <ManualAnalysisFilter pageState={pageState} setPageState={mockSetPageState} />,
        );

        const mutationInput = getByRole('combobox');
        await mutationInput.fill('S:E484K');
        const option = await vi.waitFor(() => getByRole('option', { name: 'S:E484K', exact: true }));
        await option.click();

        await vi.waitFor(() => {
            expect(mockSetPageState).toHaveBeenCalledWith({
                ...pageState,
                mutations: ['S:E484K'],
            });
        });
    });

    it('allows multiple mutations to be entered', async () => {
        const mockSetPageState = vi.fn();

        const { getByRole } = renderWithSilo(
            <ManualAnalysisFilter pageState={defaultPageState} setPageState={mockSetPageState} />,
        );

        const mutationInput = getByRole('combobox');

        await mutationInput.fill('A23T');
        const option1 = await vi.waitFor(() => getByRole('option', { name: 'A23T', exact: true }));
        await option1.click();

        await mutationInput.fill('C241T');
        const option2 = await vi.waitFor(() => getByRole('option', { name: 'C241T', exact: true }));
        await option2.click();

        await vi.waitFor(() => {
            expect(mockSetPageState).toHaveBeenCalledWith({
                ...defaultPageState,
                mutations: ['A23T'],
            });
        });

        await vi.waitFor(() => {
            expect(mockSetPageState).toHaveBeenCalledWith({
                ...defaultPageState,
                mutations: ['A23T', 'C241T'],
            });
        });
    });
});
