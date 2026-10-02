import { useQuery } from '@tanstack/react-query';

import { getClientLogger } from '../clientLogger';
import { type QueriesOverTimeQuery } from '../components/dataDisplay/queriesOverTime/queries-over-time';
import { type WasapPageConfigFor } from '../config/wasapPageConfig';
import { validateGenomeOnly } from '../dataLayer/queries';
import { getCollection } from './covSpectrum/getCollection';
import type { CollectionVariant } from './covSpectrum/types';
import { detailedMutationsToQuery } from './covSpectrum/variantConversionUtil';
import { getLineageFields, type FilterObject, type Variant } from './genSpectrum/Collection';
import { getApiServiceForClientside } from './genSpectrum/apiService';
import { getCollection as getGenSpectrumCollection } from './genSpectrum/getCollection';
import { parseQuery } from './lapis/parseQuery';
import { COLLECTION_SOURCE, type CollectionSource } from '../pageState/wasap/wasapAnalysisFilter';
import { getErrorLogMessage } from '../util/getErrorLogMessage';

const logger = getClientLogger('useCollectionQueries');

/** The queries of the collection of the collection page. Not fetched while no collection is selected. */
export function useCollectionQueries(
    config: WasapPageConfigFor<'collection'>,
    source: CollectionSource,
    collectionId: number | undefined,
) {
    // `config.genSpectrumOrganismName` stands in for `config` — it's 1:1 with it.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useQuery({
        queryKey: ['collectionQueries', config.genSpectrumOrganismName, source, collectionId],
        queryFn: () => {
            if (collectionId === undefined) {
                throw Error('No collection selected');
            }
            return fetchCollectionQueries(config, source, collectionId).catch((error: unknown) => {
                logger.error(`Failed to fetch the collection ${collectionId}: ${getErrorLogMessage(error)}`);
                throw error;
            });
        },
        enabled: collectionId !== undefined,
    });
}

export async function fetchCollectionQueries(
    config: WasapPageConfigFor<'collection'>,
    source: CollectionSource,
    collectionId: number,
): Promise<CollectionQueries> {
    if (source === COLLECTION_SOURCE.covSpectrum) {
        if (!config.covSpectrumCollectionSourceEnabled) {
            throw Error("Cannot fetch data, the 'covSpectrum' collection source is not enabled.");
        }
        return fetchCovSpectrumCollectionQueries(config.lapisBaseUrl, config.collectionsApiBaseUrl, collectionId);
    }
    return fetchGenSpectrumCollectionQueries(config.lapisBaseUrl, collectionId);
}

async function fetchGenSpectrumCollectionQueries(
    lapisBaseUrl: string,
    collectionId: number,
): Promise<CollectionQueries> {
    const collection = await getGenSpectrumCollection(getApiServiceForClientside(), String(collectionId));

    const { variantData, invalidVariants } = extractBackendVariantData(collection.variants);
    const { queries, invalidVariants: parseInvalidVariants } = await parseAndBuildQueries(lapisBaseUrl, variantData);
    const allInvalidVariants = [...invalidVariants, ...parseInvalidVariants];

    return {
        collection: { id: collection.id, title: collection.name, queries: deduplicateLabels(queries) },
        ...(allInvalidVariants.length > 0 && { invalidVariants: allInvalidVariants }),
    };
}

async function fetchCovSpectrumCollectionQueries(
    lapisBaseUrl: string,
    collectionsApiBaseUrl: string,
    collectionId: number,
): Promise<CollectionQueries> {
    const collection = await getCollection(collectionsApiBaseUrl, collectionId);

    const { variantData, invalidVariants } = extractCovSpectrumVariantData(collection.variants);
    const { queries, invalidVariants: parseInvalidVariants } = await parseAndBuildQueries(lapisBaseUrl, variantData);
    const allInvalidVariants = [...invalidVariants, ...parseInvalidVariants];

    return {
        collection: {
            id: collection.id,
            title: collection.title,
            queries: deduplicateLabels(queries),
        },
        ...(allInvalidVariants.length > 0 && { invalidVariants: allInvalidVariants }),
    };
}

type VariantQueryInput = { name: string; queryString: string; description?: string };
type VariantExtractionResult = { variantData: VariantQueryInput[]; invalidVariants: InvalidVariantInfo[] };

function extractCovSpectrumVariantData(variants: CollectionVariant[]): VariantExtractionResult {
    const variantData: VariantQueryInput[] = [];
    const invalidVariants: InvalidVariantInfo[] = [];

    for (const variant of variants) {
        let queryString: string;
        switch (variant.query.type) {
            case 'variantQuery':
                queryString = variant.query.variantQuery;
                break;
            case 'detailedMutations':
                queryString = detailedMutationsToQuery(variant.query);
                break;
        }
        if (queryString === '') {
            invalidVariants.push({ name: variant.name, error: 'Variant is empty.' });
            continue;
        }
        variantData.push({
            name: variant.name,
            queryString,
            description: variant.description !== '' ? variant.description : undefined,
        });
    }

    return { variantData, invalidVariants };
}

function extractBackendVariantData(variants: Variant[]): VariantExtractionResult {
    const variantData: VariantQueryInput[] = [];
    const invalidVariants: InvalidVariantInfo[] = [];

    for (const variant of variants) {
        let queryString: string;
        switch (variant.type) {
            case 'query':
                queryString = variant.countQuery;
                break;
            case 'filterObject':
                queryString = filterObjectToQueryString(variant.filterObject);
                break;
        }
        if (queryString === '') {
            invalidVariants.push({ name: variant.name, error: 'Variant is empty.' });
            continue;
        }
        variantData.push({
            name: variant.name,
            queryString,
            description: variant.description ?? undefined,
        });
    }

    return { variantData, invalidVariants };
}

/**
 * Takes a list of variant queries (from a collection) and validates them all against a LAPIS.
 * For valid variant queries, it builds a `QueriesOverTimeQuery` (the parsed,
 * genome-only expression the SILO grid asks) to use with `QueriesOverTime`.
 * For invalid queries, an `InvalidVariantInfo` is returned.
 *
 * `/query/parse` is the one LAPIS call the SILO build keeps — SILO has no parse
 * endpoint. The count / coverage (`q || !maybe(q)`) split happens SILO-side now,
 * on the parsed AST, not by string-mangling here.
 */
async function parseAndBuildQueries(
    lapisBaseUrl: string,
    variantData: VariantQueryInput[],
): Promise<{ queries: QueriesOverTimeQuery[]; invalidVariants: InvalidVariantInfo[] }> {
    const queries: QueriesOverTimeQuery[] = [];
    const invalidVariants: InvalidVariantInfo[] = [];

    if (variantData.length === 0) {
        return { queries, invalidVariants };
    }

    const parseResults = await parseQuery(lapisBaseUrl, { queries: variantData.map((vd) => vd.queryString) });

    variantData.forEach(({ name, queryString, description }, index) => {
        const parseResult = parseResults[index];
        if (parseResult.type === 'failure') {
            invalidVariants.push({ name, error: `Parse error: ${parseResult.error}` });
            return;
        }
        const validationResult = validateGenomeOnly(parseResult.filter);
        if (!validationResult.isGenomeOnly) {
            invalidVariants.push({ name, error: validationResult.error });
            return;
        }
        queries.push({ displayLabel: name, description, query: queryString, filter: parseResult.filter });
    });

    return { queries, invalidVariants };
}

function deduplicateLabels<T extends { displayLabel: string }>(queries: T[]): T[] {
    const seen: Record<string, number> = {};
    return queries.map((q) => {
        const count = (seen[q.displayLabel] = (seen[q.displayLabel] ?? 0) + 1);
        return count === 1 ? q : { ...q, displayLabel: `${q.displayLabel} (${count})` };
    });
}

function filterObjectToQueryString(filterObject: FilterObject): string {
    const parts = [
        ...getLineageFields(filterObject).map(([field, value]) => `${field}=${value}`),
        ...(filterObject.nucleotideMutations ?? []),
        ...(filterObject.aminoAcidMutations ?? []),
        ...(filterObject.nucleotideInsertions ?? []),
        ...(filterObject.aminoAcidInsertions ?? []),
    ];
    return parts.join(' & ');
}

/**
 * Name of the invalid variant, and the error (why it's not valid).
 */
type InvalidVariantInfo = {
    name: string;
    error: string;
};

/**
 * A collection with the queries of its valid variants, and those of its variants that are not valid.
 */
export type CollectionQueries = {
    collection: {
        id: number;
        title: string;
        queries: QueriesOverTimeQuery[];
    };
    invalidVariants?: InvalidVariantInfo[];
};
