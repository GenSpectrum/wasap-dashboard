import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { CollectionAnalysisFilter } from './CollectionAnalysisFilter';
import { DUMMY_BACKEND_URL } from '../../../../routeMocker';
import { it } from '../../../../test-extend';
import type * as ApiServiceModule from '../../../externalData/genSpectrum/apiService';
import type { WasapCollectionFilter } from '../../../pageState/wasap/wasapAnalysisFilter';

vi.mock('../../../externalData/genSpectrum/apiService.ts', async (importOriginal) => {
    const mod = await importOriginal<typeof ApiServiceModule>();
    return { ...mod, getApiServiceForClientside: () => new mod.ApiService(DUMMY_BACKEND_URL) };
});

const DUMMY_COV_SPECTRUM_URL = 'https://cov-spectrum-dummy.com/api';

const genSpectrumCollections = [
    { id: 1, name: '3CLpro', ownedBy: 1, organism: 'covid', description: null, variantCount: 3, tags: [] },
    { id: 2, name: 'RdRp', ownedBy: 1, organism: 'covid', description: null, variantCount: 2, tags: [] },
];
const covSpectrumCollections = [
    {
        id: 42,
        title: '3CLpro',
        description: 'Test collection',
        maintainers: 'Test',
        email: 'test@example.com',
        variants: [],
    },
];

const genSpectrumFilter: WasapCollectionFilter = { mode: 'collection', source: 'genSpectrum', collectionId: 1 };
const covSpectrumFilter: WasapCollectionFilter = { mode: 'collection', source: 'covSpectrum', collectionId: 42 };

function renderFilter(
    pageState: WasapCollectionFilter,
    covSpectrum?: { collectionsApiBaseUrl: string; collectionTitleFilter: string },
) {
    const setPageState = vi.fn();
    const queryClient = new QueryClient();
    const screen = render(
        <QueryClientProvider client={queryClient}>
            <CollectionAnalysisFilter
                pageState={pageState}
                setPageState={setPageState}
                organism='covid'
                covSpectrum={covSpectrum}
            />
        </QueryClientProvider>,
    );
    return { ...screen, setPageState };
}

describe('CollectionAnalysisFilter', () => {
    it('shows the GenSpectrum collections and no source selector when CoV-Spectrum is not enabled', async ({
        routeMockers: { backend },
    }) => {
        backend.mockGetCollections('covid', genSpectrumCollections);

        const { getByRole, getByText } = renderFilter(genSpectrumFilter);

        expect(getByText('Collection source').elements()).toHaveLength(0);
        await expect.element(getByRole('combobox')).toHaveValue('1');
    });

    it('calls setPageState when a different GenSpectrum collection is picked', async ({
        routeMockers: { backend },
    }) => {
        backend.mockGetCollections('covid', genSpectrumCollections);

        const { getByRole, setPageState } = renderFilter(genSpectrumFilter);

        await getByRole('combobox').selectOptions('2');

        expect(setPageState).toHaveBeenCalledWith({ ...genSpectrumFilter, collectionId: 2 });
    });

    it('shows a source selector once CoV-Spectrum is enabled here too', async ({ routeMockers: { backend } }) => {
        backend.mockGetCollections('covid', genSpectrumCollections);

        const { getByRole } = renderFilter(genSpectrumFilter, {
            collectionsApiBaseUrl: DUMMY_COV_SPECTRUM_URL,
            collectionTitleFilter: 'pro',
        });

        await expect.element(getByRole('radio', { name: 'GenSpectrum' })).toBeChecked();
        await expect.element(getByRole('radio', { name: 'CoV-Spectrum' })).not.toBeChecked();
    });

    it('switches the collection list and clears the collectionId when the source is switched', async ({
        routeMockers: { backend },
    }) => {
        backend.mockGetCollections('covid', genSpectrumCollections);

        const { getByRole, setPageState } = renderFilter(genSpectrumFilter, {
            collectionsApiBaseUrl: DUMMY_COV_SPECTRUM_URL,
            collectionTitleFilter: 'pro',
        });

        await getByRole('radio', { name: 'CoV-Spectrum' }).click();

        expect(setPageState).toHaveBeenCalledWith({
            ...genSpectrumFilter,
            source: 'covSpectrum',
            collectionId: undefined,
        });
    });

    it('shows the CoV-Spectrum collections when that source is selected', async ({ routeMockers: { covSpectrum } }) => {
        covSpectrum.mockGetCollections(DUMMY_COV_SPECTRUM_URL, covSpectrumCollections);

        const { getByRole } = renderFilter(covSpectrumFilter, {
            collectionsApiBaseUrl: DUMMY_COV_SPECTRUM_URL,
            collectionTitleFilter: 'pro',
        });

        await expect.element(getByRole('combobox')).toHaveValue('42');
    });
});
