import { http } from 'msw';
import { describe, expect, test, vi } from 'vitest';

import { fetchCollectionQueries } from './useCollectionQueries';
import { DUMMY_BACKEND_URL, DUMMY_LAPIS_URL } from '../../routeMocker';
import { backendRouteMocker, lapisRouteMocker, testServer } from '../../vitest.setup';
import type { WasapPageConfig } from '../config/wasapPageConfig';
import type { Collection } from './genSpectrum/Collection';
import type * as ApiServiceModule from './genSpectrum/apiService';
import { WASAP_ANALYSIS_MODE } from '../pageState/wasap/wasapAnalysisFilter';

vi.mock('./genSpectrum/apiService.ts', async (importOriginal) => {
    const mod = await importOriginal<typeof ApiServiceModule>();
    return {
        ...mod,
        getApiServiceForClientside: () => new mod.ApiService(DUMMY_BACKEND_URL),
    };
});

const DUMMY_COV_SPECTRUM_URL = 'http://cov-spectrum.dummy/api/v2';

// these fields have no effect on data fetching, but need to be present to have a correct type.
const unusedBaseConfigFields = {
    genSpectrumOrganismName: 'covid' as const,
    name: '',
    path: '',
    description: '',
    linkTemplate: { nucleotideMutation: '', aminoAcidMutation: '' },
    samplingDateField: '',
    locationNameField: '',
    silo: {
        url: '',
        table: 'default',
        dateColumn: 'date',
        dateColumnIsDictionaryEncoded: true,
        samplingDateColumn: 'samplingDate',
        locationNameColumn: 'locationName',
        sampleIdColumn: 'sampleId',
        batchIdColumn: 'batchId',
    },
    defaultLocationName: '',
    browseDataUrl: '',
    browseDataDescription: '',
};

const baseConfigFields: WasapPageConfig = {
    ...unusedBaseConfigFields,
    lapisBaseUrl: DUMMY_LAPIS_URL,
};

describe('fetchCollectionQueries', () => {
    const config = {
        ...baseConfigFields,
        lapisBaseUrl: DUMMY_LAPIS_URL,
        collectionAnalysisModeEnabled: true as const,
        filterDefaults: {
            collection: { mode: WASAP_ANALYSIS_MODE.collection, source: 'genSpectrum' as const, collectionId: 1 },
        },
        genSpectrumCollectionLinkOut: 'https://genspectrum.org/collections/covid/{{id}}',
    };

    describe('GenSpectrum source', () => {
        test('fetches collection from backend and builds queries for query-type variants', async () => {
            backendRouteMocker.mockGetCollection('1', {
                id: 1,
                name: 'Test Collection',
                ownedBy: 1,
                organism: 'sc2',
                description: null,
                variantCount: 2,
                tags: [],
                variants: [
                    {
                        type: 'query',
                        id: 1,
                        collectionId: 1,
                        name: 'JN.1',
                        description: null,
                        countQuery: 'JN.1*',
                        coverageQuery: null,
                    },
                    {
                        type: 'query',
                        id: 2,
                        collectionId: 1,
                        name: 'XEC',
                        description: 'XEC lineage',
                        countQuery: 'XEC*',
                        coverageQuery: null,
                    },
                ],
            });
            lapisRouteMocker.mockPostQueryParse(
                { queries: ['JN.1*', 'XEC*'] },
                {
                    data: [
                        {
                            type: 'success',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 1 },
                        },
                        {
                            type: 'success',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 2 },
                        },
                    ],
                },
            );

            const result = await fetchCollectionQueries(config, 'genSpectrum', 1);

            expect(result).toEqual({
                collection: {
                    id: 1,
                    title: 'Test Collection',
                    queries: [
                        {
                            displayLabel: 'JN.1',
                            description: undefined,
                            query: 'JN.1*',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 1 },
                        },
                        {
                            displayLabel: 'XEC',
                            description: 'XEC lineage',
                            query: 'XEC*',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 2 },
                        },
                    ],
                },
            });
        });

        test('builds query string from filterObject variant', async () => {
            backendRouteMocker.mockGetCollection('1', {
                id: 1,
                name: 'Filter Collection',
                ownedBy: 1,
                organism: 'sc2',
                description: null,
                variantCount: 1,
                tags: [],
                variants: [
                    {
                        type: 'filterObject',
                        id: 1,
                        collectionId: 1,
                        name: 'Variant',
                        description: null,
                        filterObject: { nucleotideMutations: ['A123T'], aminoAcidMutations: ['S:E484K'] },
                    },
                ],
                // filter object causes type issues unfortunately
            } as unknown as Collection);
            lapisRouteMocker.mockPostQueryParse(
                { queries: ['A123T & S:E484K'] },
                {
                    data: [
                        {
                            type: 'success',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 123 },
                        },
                    ],
                },
            );

            const result = await fetchCollectionQueries(config, 'genSpectrum', 1);

            expect(result).toEqual({
                collection: {
                    id: 1,
                    title: 'Filter Collection',
                    queries: [
                        {
                            displayLabel: 'Variant',
                            description: undefined,
                            query: 'A123T & S:E484K',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 123 },
                        },
                    ],
                },
            });
        });

        test('builds query string from filterObject variant with a lineage field', async () => {
            backendRouteMocker.mockGetCollection('1', {
                id: 1,
                name: 'Filter Collection',
                ownedBy: 1,
                organism: 'sc2',
                description: null,
                variantCount: 1,
                tags: [],
                variants: [
                    {
                        type: 'filterObject',
                        id: 1,
                        collectionId: 1,
                        name: 'Variant',
                        description: null,
                        filterObject: { pangoLineage: 'JN.1', nucleotideMutations: ['A123T'] },
                    },
                ],
                // filter object causes type issues unfortunately
            } as unknown as Collection);
            lapisRouteMocker.mockPostQueryParse(
                { queries: ['pangoLineage=JN.1 & A123T'] },
                {
                    data: [
                        {
                            type: 'success',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 123 },
                        },
                    ],
                },
            );

            const result = await fetchCollectionQueries(config, 'genSpectrum', 1);

            expect(result).toEqual({
                collection: {
                    id: 1,
                    title: 'Filter Collection',
                    queries: [
                        {
                            displayLabel: 'Variant',
                            description: undefined,
                            query: 'pangoLineage=JN.1 & A123T',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 123 },
                        },
                    ],
                },
            });
        });

        test('reports variants that fail query parsing as invalid', async () => {
            backendRouteMocker.mockGetCollection('1', {
                id: 1,
                name: 'Test Collection',
                ownedBy: 1,
                organism: 'sc2',
                description: null,
                variantCount: 2,
                tags: [],
                variants: [
                    {
                        type: 'query',
                        id: 1,
                        collectionId: 1,
                        name: 'Valid',
                        description: null,
                        countQuery: 'JN.1*',
                        coverageQuery: null,
                    },
                    {
                        type: 'query',
                        id: 2,
                        collectionId: 1,
                        name: 'Bad',
                        description: null,
                        countQuery: 'bad query!',
                        coverageQuery: null,
                    },
                ],
            });
            lapisRouteMocker.mockPostQueryParse(
                { queries: ['JN.1*', 'bad query!'] },
                {
                    data: [
                        {
                            type: 'success',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 123 },
                        },
                        { type: 'failure', error: 'Unexpected token' },
                    ],
                },
            );

            const result = await fetchCollectionQueries(config, 'genSpectrum', 1);

            expect(result).toMatchObject({
                invalidVariants: [{ name: 'Bad', error: expect.stringContaining('Parse error') }],
            });
        });

        test('reports empty filterObject variants as invalid', async () => {
            backendRouteMocker.mockGetCollection('1', {
                id: 1,
                name: 'Test Collection',
                ownedBy: 1,
                organism: 'sc2',
                description: null,
                variantCount: 1,
                tags: [],
                variants: [
                    {
                        type: 'filterObject',
                        id: 1,
                        collectionId: 1,
                        name: 'Empty',
                        description: null,
                        filterObject: {},
                    },
                ],
            });
            lapisRouteMocker.mockPostQueryParse({ queries: [] }, { data: [] });

            const result = await fetchCollectionQueries(config, 'genSpectrum', 1);

            expect(result).toMatchObject({
                invalidVariants: [{ name: 'Empty', error: 'Variant is empty.' }],
            });
        });

        test('deduplicates variant display labels', async () => {
            backendRouteMocker.mockGetCollection('1', {
                id: 1,
                name: 'Test Collection',
                ownedBy: 1,
                organism: 'sc2',
                description: null,
                variantCount: 2,
                tags: [],
                variants: [
                    {
                        type: 'query',
                        id: 1,
                        collectionId: 1,
                        name: 'Variant',
                        description: null,
                        countQuery: 'JN.1*',
                        coverageQuery: null,
                    },
                    {
                        type: 'query',
                        id: 2,
                        collectionId: 1,
                        name: 'Variant',
                        description: null,
                        countQuery: 'XEC*',
                        coverageQuery: null,
                    },
                ],
            });
            lapisRouteMocker.mockPostQueryParse(
                { queries: ['JN.1*', 'XEC*'] },
                {
                    data: [
                        {
                            type: 'success',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 1 },
                        },
                        {
                            type: 'success',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 2 },
                        },
                    ],
                },
            );

            const result = await fetchCollectionQueries(config, 'genSpectrum', 1);

            expect(result).toEqual({
                collection: {
                    id: 1,
                    title: 'Test Collection',
                    queries: [
                        {
                            displayLabel: 'Variant',
                            description: undefined,
                            query: 'JN.1*',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 1 },
                        },
                        {
                            displayLabel: 'Variant (2)',
                            description: undefined,
                            query: 'XEC*',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 2 },
                        },
                    ],
                },
            });
        });
    });

    describe('CoV-Spectrum source', () => {
        const configWithCovSpectrum = {
            ...config,
            covSpectrumCollectionSourceEnabled: true as const,
            collectionsApiBaseUrl: DUMMY_COV_SPECTRUM_URL,
            collectionTitleFilter: '',
        };

        test('fetches collection from CovSpectrum and builds queries for each variant', async () => {
            testServer.use(
                http.get(`${DUMMY_COV_SPECTRUM_URL}/resource/collection/42`, () =>
                    Response.json({
                        id: 42,
                        title: 'Test Collection',
                        description: 'A test',
                        maintainers: 'Testers',
                        email: 'test@example.com',
                        variants: [
                            {
                                query: JSON.stringify({ type: 'variantQuery', variantQuery: 'JN.1*' }),
                                name: 'JN.1',
                                description: '',
                                highlighted: false,
                            },
                            {
                                query: JSON.stringify({ type: 'variantQuery', variantQuery: 'XEC*' }),
                                name: 'XEC',
                                description: 'XEC lineage',
                                highlighted: false,
                            },
                        ],
                    }),
                ),
            );
            lapisRouteMocker.mockPostQueryParse(
                { queries: ['JN.1*', 'XEC*'] },
                {
                    data: [
                        {
                            type: 'success',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 123 },
                        },
                        {
                            type: 'success',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 456 },
                        },
                    ],
                },
            );

            const result = await fetchCollectionQueries(configWithCovSpectrum, 'covSpectrum', 42);

            expect(result).toEqual({
                collection: {
                    id: 42,
                    title: 'Test Collection',
                    queries: [
                        {
                            displayLabel: 'JN.1',
                            description: undefined,
                            query: 'JN.1*',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 123 },
                        },
                        {
                            displayLabel: 'XEC',
                            description: 'XEC lineage',
                            query: 'XEC*',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 456 },
                        },
                    ],
                },
            });
        });

        test('reports variants that fail query parsing as invalid', async () => {
            testServer.use(
                http.get(`${DUMMY_COV_SPECTRUM_URL}/resource/collection/42`, () =>
                    Response.json({
                        id: 42,
                        title: 'Test Collection',
                        description: '',
                        maintainers: 'test',
                        email: 'test@example.com',
                        variants: [
                            {
                                query: JSON.stringify({ type: 'variantQuery', variantQuery: 'XEC*' }),
                                name: 'XEC',
                                description: '',
                                highlighted: false,
                            },
                            {
                                query: JSON.stringify({ type: 'variantQuery', variantQuery: 'bad query!' }),
                                name: 'Bad',
                                description: '',
                                highlighted: false,
                            },
                        ],
                    }),
                ),
            );
            lapisRouteMocker.mockPostQueryParse(
                { queries: ['XEC*', 'bad query!'] },
                {
                    data: [
                        {
                            type: 'success',
                            filter: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 123 },
                        },
                        { type: 'failure', error: 'Unexpected token' },
                    ],
                },
            );

            const result = await fetchCollectionQueries(configWithCovSpectrum, 'covSpectrum', 42);

            expect(result).toMatchObject({
                invalidVariants: [{ name: 'Bad', error: expect.stringContaining('Parse error') }],
            });
        });

        test('throws when the CoV-Spectrum source is not enabled here', async () => {
            await expect(fetchCollectionQueries(config, 'covSpectrum', 42)).rejects.toThrow(
                "Cannot fetch data, the 'covSpectrum' collection source is not enabled.",
            );
        });
    });
});
