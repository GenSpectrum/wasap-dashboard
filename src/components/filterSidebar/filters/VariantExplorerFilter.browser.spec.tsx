import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement } from 'react';
import { describe, expect, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { VariantExplorerFilter } from './VariantExplorerFilter';
import { type LapisRouteMocker } from '../../../../routeMocker';
import { it } from '../../../../test-extend';
import { buildLineageTree } from '../../../lineageTree/lineageTree';
import type { WasapVariantFilter } from '../../../pageState/wasap/wasapAnalysisFilter';

const DUMMY_LAPIS_URL_2 = 'http://lapis2.dummy';

/** The lineage picker reads via TanStack Query; the app provides the client at its root. */
const renderWithQueryClient = (ui: ReactElement) =>
    render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

/* eslint-disable @typescript-eslint/naming-convention -- the field names of the Auspice JSON format */
const lineageTree = buildLineageTree(
    {
        name: 'NODE_0',
        node_attrs: { lineage: { value: 'B' } },
        children: [
            { name: 'NODE_1', node_attrs: { lineage: { value: 'XBB.1.5' } } },
            { name: 'NODE_2', node_attrs: { lineage: { value: 'JN.1' } } },
        ],
    },
    'lineage',
);
/* eslint-enable @typescript-eslint/naming-convention */

describe('VariantExplorerFilter', () => {
    const defaultPageState: WasapVariantFilter = {
        mode: 'variant',
        signatureType: 'computed',
        sequenceType: 'nucleotide',
        variant: undefined,
        minProportion: 0.05,
        minCount: 10,
        minJaccard: 0.5,
        timeFrame: 'all',
    };

    const predefinedPageState: WasapVariantFilter = {
        ...defaultPageState,
        signatureType: 'predefined',
    };

    it('calls setPageState when changing sequence type', async ({ routeMockers: { lapis } }) => {
        setupLapisMocks(lapis);
        const mockSetPageState = vi.fn();

        const { getByLabelText } = renderWithQueryClient(
            <VariantExplorerFilter
                pageState={defaultPageState}
                setPageState={mockSetPageState}
                clinicalSequenceLapisBaseUrl={DUMMY_LAPIS_URL_2}
                clinicalSequenceLapisLineageField='pangoLineage'
                lineageTree={undefined}
            />,
        );

        const aminoAcidRadio = getByLabelText('Amino acid');
        await aminoAcidRadio.click();

        expect(mockSetPageState).toHaveBeenCalledWith({
            ...defaultPageState,
            sequenceType: 'amino acid',
        });
    });

    it('allows selecting a variant from the lineage selector', async ({ routeMockers: { lapis } }) => {
        setupLapisMocks(lapis);
        const mockSetPageState = vi.fn();

        const { getByRole } = renderWithQueryClient(
            <VariantExplorerFilter
                pageState={defaultPageState}
                setPageState={mockSetPageState}
                clinicalSequenceLapisBaseUrl={DUMMY_LAPIS_URL_2}
                clinicalSequenceLapisLineageField='pangoLineage'
                lineageTree={undefined}
            />,
        );

        const variantCombobox = await vi.waitFor(() => getByRole('combobox', { name: /variant/i }));

        await userEvent.click(variantCombobox);
        await userEvent.type(variantCombobox, 'JN.1');

        const option = await vi.waitFor(() => getByRole('option', { name: 'JN.1', exact: true }));
        await option.click();

        await vi.waitFor(() => {
            expect(mockSetPageState).toHaveBeenCalledWith({
                ...defaultPageState,
                variant: 'JN.1',
            });
        });
    });

    it('calls setPageState when changing min proportion', async ({ routeMockers: { lapis } }) => {
        setupLapisMocks(lapis);
        const mockSetPageState = vi.fn();

        const { getByRole } = renderWithQueryClient(
            <VariantExplorerFilter
                pageState={defaultPageState}
                setPageState={mockSetPageState}
                clinicalSequenceLapisBaseUrl={DUMMY_LAPIS_URL_2}
                clinicalSequenceLapisLineageField='pangoLineage'
                lineageTree={undefined}
            />,
        );

        const minProportionInput = getByRole('spinbutton').first();
        await minProportionInput.fill('0.1');

        expect(mockSetPageState).toHaveBeenCalledWith({
            ...defaultPageState,
            minProportion: 0.1,
        });
    });

    it('calls setPageState when switching to predefined signature type', async ({ routeMockers: { lapis } }) => {
        setupLapisMocks(lapis);
        const mockSetPageState = vi.fn();

        renderWithQueryClient(
            <VariantExplorerFilter
                pageState={defaultPageState}
                setPageState={mockSetPageState}
                clinicalSequenceLapisBaseUrl={DUMMY_LAPIS_URL_2}
                clinicalSequenceLapisLineageField='pangoLineage'
                lineageTree={lineageTree}
            />,
        );

        const variantSourceSelect = page.getByRole('combobox').first();
        await variantSourceSelect.selectOptions('predefined');

        expect(mockSetPageState).toHaveBeenCalledWith({
            ...defaultPageState,
            signatureType: 'predefined',
        });
    });

    it('calls setPageState with the background lineages picked', async ({ routeMockers: { lapis } }) => {
        setupLapisMocks(lapis);
        const mockSetPageState = vi.fn();

        const { getByRole } = renderWithQueryClient(
            <VariantExplorerFilter
                pageState={{ ...predefinedPageState, backgroundLineages: ['JN.1'] }}
                setPageState={mockSetPageState}
                clinicalSequenceLapisBaseUrl={DUMMY_LAPIS_URL_2}
                clinicalSequenceLapisLineageField='pangoLineage'
                lineageTree={lineageTree}
            />,
        );

        await page.getByPlaceholder('Add a lineage').fill('XBB.1.5');
        // The background lineages' combobox comes after the variant's, which lists the lineages too.
        await getByRole('option', { name: 'XBB.1.5', exact: true }).last().click();

        await vi.waitFor(() => {
            expect(mockSetPageState).toHaveBeenCalledWith({
                ...predefinedPageState,
                backgroundLineages: ['JN.1', 'XBB.1.5'],
            });
        });
    });

    it('calls setPageState when selecting a predefined lineage', async ({ routeMockers: { lapis } }) => {
        setupLapisMocks(lapis);
        const mockSetPageState = vi.fn();

        const { getByRole } = renderWithQueryClient(
            <VariantExplorerFilter
                pageState={predefinedPageState}
                setPageState={mockSetPageState}
                clinicalSequenceLapisBaseUrl={DUMMY_LAPIS_URL_2}
                clinicalSequenceLapisLineageField='pangoLineage'
                lineageTree={lineageTree}
            />,
        );

        const lineageInput = page.getByPlaceholder('Select variant');
        await lineageInput.click();
        await userEvent.type(lineageInput, 'XBB');

        // The variant's combobox comes before that of the background lineages, which lists the lineages too.
        const option = await vi.waitFor(() => getByRole('option', { name: 'XBB.1.5', exact: true }).first());
        await option.click();

        await vi.waitFor(() => {
            expect(mockSetPageState).toHaveBeenCalledWith({
                ...predefinedPageState,
                lineage: 'XBB.1.5',
            });
        });
    });

    it('calls setPageState when toggling "Mutation not in parent"', async ({ routeMockers: { lapis } }) => {
        setupLapisMocks(lapis);
        const mockSetPageState = vi.fn();

        const { getByLabelText } = renderWithQueryClient(
            <VariantExplorerFilter
                pageState={predefinedPageState}
                setPageState={mockSetPageState}
                clinicalSequenceLapisBaseUrl={DUMMY_LAPIS_URL_2}
                clinicalSequenceLapisLineageField='pangoLineage'
                lineageTree={lineageTree}
            />,
        );

        const checkbox = getByLabelText('Mutation not in parent');
        await checkbox.click();

        expect(mockSetPageState).toHaveBeenCalledWith({
            ...predefinedPageState,
            newMutationsOnly: true,
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
