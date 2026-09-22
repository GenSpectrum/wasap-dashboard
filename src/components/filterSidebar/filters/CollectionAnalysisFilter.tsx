import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getCollections as getCovSpectrumCollections } from '../../../externalData/covSpectrum/getCollections';
import { getApiServiceForClientside } from '../../../externalData/genSpectrum/apiService';
import { getCollections as getGenSpectrumCollections } from '../../../externalData/genSpectrum/getCollections';
import { COLLECTION_SOURCE, type WasapCollectionFilter } from '../../../pageState/wasap/wasapAnalysisFilter';
import { CollectionInfo } from '../../InfoBlocks';
import { LabeledField } from '../../inputs/LabeledField';
import { RadioSelect } from '../../inputs/RadioSelect';

type CollectionAnalysisFilterProps = {
    pageState: WasapCollectionFilter;
    setPageState: (newState: WasapCollectionFilter) => void;
    /** GenSpectrum's collections are keyed by organism, and always available. */
    organism: string;
    /** Present only when this organism also has the CoV-Spectrum collection source enabled. */
    covSpectrum?: {
        collectionsApiBaseUrl: string;
        collectionTitleFilter: string;
    };
};

/**
 * Picks a collection, either from GenSpectrum's own collections (always available) or, where
 * the organism has it, from CoV-Spectrum's. With only one source available there is nothing to
 * pick between, so the source selector doesn't show.
 */
export function CollectionAnalysisFilter({
    pageState,
    setPageState,
    organism,
    covSpectrum,
}: CollectionAnalysisFilterProps) {
    return (
        <>
            {covSpectrum !== undefined && (
                <RadioSelect
                    label='Collection source'
                    value={pageState.source}
                    options={[
                        { value: COLLECTION_SOURCE.genSpectrum, label: 'GenSpectrum' },
                        { value: COLLECTION_SOURCE.covSpectrum, label: 'CoV-Spectrum' },
                    ]}
                    onChange={(source) => {
                        if (source === pageState.source) {
                            return;
                        }
                        // Collection IDs aren't shared between the two sources.
                        setPageState({ ...pageState, source, collectionId: undefined });
                    }}
                />
            )}
            {pageState.source === COLLECTION_SOURCE.covSpectrum && covSpectrum !== undefined ? (
                <CovSpectrumCollectionSelect pageState={pageState} setPageState={setPageState} {...covSpectrum} />
            ) : (
                <GenSpectrumCollectionSelect pageState={pageState} setPageState={setPageState} organism={organism} />
            )}
        </>
    );
}

function GenSpectrumCollectionSelect({
    pageState,
    setPageState,
    organism,
}: {
    pageState: WasapCollectionFilter;
    setPageState: (newState: WasapCollectionFilter) => void;
    organism: string;
}) {
    const {
        data: collections,
        isPending,
        isError,
    } = useQuery({
        queryKey: ['collections', organism],
        queryFn: () => getGenSpectrumCollections(getApiServiceForClientside(), { organism }),
    });

    const firstCollectionId = collections?.[0]?.id;
    useEffect(() => {
        if (firstCollectionId !== undefined && pageState.collectionId === undefined) {
            setPageState({ ...pageState, collectionId: firstCollectionId });
        }
    }, [firstCollectionId, pageState, setPageState]);

    return (
        <LabeledField label='Collection'>
            {isPending ? (
                <div className='text-sm text-gray-500'>Loading collections...</div>
            ) : isError ? (
                <div className='text-error text-sm'>Error loading collections</div>
            ) : collections.length === 0 ? (
                <div className='text-sm text-gray-500'>No collections available</div>
            ) : (
                <select
                    className='select select-bordered'
                    value={pageState.collectionId ?? ''}
                    onChange={(e) =>
                        setPageState({
                            ...pageState,
                            collectionId: e.target.value ? Number(e.target.value) : undefined,
                        })
                    }
                >
                    {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                            #{collection.id} {collection.name}
                        </option>
                    ))}
                </select>
            )}
        </LabeledField>
    );
}

function CovSpectrumCollectionSelect({
    pageState,
    setPageState,
    collectionsApiBaseUrl,
    collectionTitleFilter,
}: {
    pageState: WasapCollectionFilter;
    setPageState: (newState: WasapCollectionFilter) => void;
    collectionsApiBaseUrl: string;
    collectionTitleFilter: string;
}) {
    const {
        data: collections,
        isPending,
        isError,
    } = useQuery({
        queryKey: ['collections', collectionsApiBaseUrl, collectionTitleFilter],
        queryFn: () => getCovSpectrumCollections(collectionsApiBaseUrl, collectionTitleFilter),
    });

    return (
        <LabeledField label='Collection' info={<CollectionInfo />}>
            {isPending ? (
                <div className='text-sm text-gray-500'>Loading collections...</div>
            ) : isError ? (
                <div className='text-error text-sm'>Error loading collections</div>
            ) : (
                <select
                    className='select select-bordered'
                    value={pageState.collectionId ?? ''}
                    onChange={(e) =>
                        setPageState({
                            ...pageState,
                            collectionId: e.target.value ? Number(e.target.value) : undefined,
                        })
                    }
                >
                    <option value=''>Select a collection...</option>
                    {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                            #{collection.id} {collection.title}
                        </option>
                    ))}
                </select>
            )}
        </LabeledField>
    );
}
