import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import type {
    VariantTimeFrame,
    WasapAnalysisFilter,
    WasapCollectionFilter,
    WasapCovSpectrumCollectionFilter,
    WasapManualFilter,
    WasapPageConfig,
    WasapResistanceFilter,
    WasapUntrackedFilter,
    WasapVariantFilter,
} from '../../../config/wasapPageConfig';
import { validateGenomeOnly } from '../../../dataLayer/queries';
import { getCollection } from '../../../externalData/covSpectrum/getCollection';
import type { CollectionVariant } from '../../../externalData/covSpectrum/types';
import { detailedMutationsToQuery } from '../../../externalData/covSpectrum/variantConversionUtil';
import { getApiServiceForClientside } from '../../../externalData/genSpectrum/apiService';
import { getCollection as getGenSpectrumCollection } from '../../../externalData/genSpectrum/getCollection';
import { getCladeLineages } from '../../../externalData/lapis/getCladeLineages';
import { getJaccardForMutations, getMutations, getMutationsForVariant } from '../../../externalData/lapis/getMutations';
import { parseQuery } from '../../../externalData/lapis/parseQuery';
import { getLineageFields } from '../../../types/Collection';
import type { FilterObject, Variant } from '../../../types/Collection';
import { type LapisFilter } from '../../../types/dashboardComponents';
import { type QueriesOverTimeQuery } from '../../queriesOverTime/queries-over-time';
import { type CustomColumn } from '../../shared/features-over-time-grid';

/**
 * Hook that fetches and returns `WasapPageData` for the W-ASAP page,
 * depending on the analysis mode and analysis mode settings.
 * The `resistanceMutationsBySet` data, derived from server-fetched collections,
 * is needed because resistance is also a possible analysis mode.
 */
export function useWasapPageData(
    config: WasapPageConfig,
    resistanceMutationsBySet: Record<string, string[]>,
    analysis: WasapAnalysisFilter,
) {
    // `config.internalName` stands in for `config` — it's 1:1 with it (one
    // static config per organism), and this hook doesn't remount on organism
    // switch, so it has to be in the key too.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useQuery({
        queryKey: ['wasap', analysis, resistanceMutationsBySet, config.internalName],
        queryFn: () => fetchWasapPageData(config, resistanceMutationsBySet, analysis),
    });
}

export async function fetchWasapPageData(
    config: WasapPageConfig,
    resistanceMutationsBySet: Record<string, string[]>,
    analysis: WasapAnalysisFilter,
): Promise<WasapPageData> {
    switch (analysis.mode) {
        case 'manual':
            return fetchManualModeData(config, analysis);
        case 'variant':
            return fetchVariantModeData(config, analysis);
        case 'resistance':
            return fetchResistanceModeData(resistanceMutationsBySet, analysis);
        case 'untracked':
            return fetchUntrackedModeData(config, analysis);
        case 'covSpectrumCollection':
            return fetchCovSpectrumCollectionModeData(config, analysis);
        case 'collection':
            return fetchCollectionModeData(config, analysis);
    }
}

function fetchManualModeData(config: WasapPageConfig, analysis: WasapManualFilter): WasapMutationsData {
    if (!config.manualAnalysisModeEnabled) {
        throw Error("Cannot fetch data, 'manual' mode is not enabled.");
    }
    return {
        type: 'mutations',
        displayMutations: analysis.mutations,
    };
}

async function fetchVariantModeData(
    config: WasapPageConfig,
    analysis: WasapVariantFilter,
): Promise<WasapMutationsData> {
    if (!config.variantAnalysisModeEnabled) {
        throw Error("Cannot fetch data, 'variant' mode is not enabled.");
    }
    switch (analysis.signatureType) {
        case 'computed':
            return fetchVariantComputedModeData(config, analysis);
        case 'predefined':
            return fetchVariantPredefinedModeData(config, analysis);
    }
}

async function fetchVariantComputedModeData(
    config: WasapPageConfig,
    analysis: WasapVariantFilter,
): Promise<WasapMutationsData> {
    if (!config.variantAnalysisModeEnabled) {
        throw Error("Cannot fetch data, 'variant' mode is not enabled.");
    }
    const mutationsWithScore = await getMutationsForVariant(
        config.clinicalLapis.lapisBaseUrl,
        analysis.sequenceType,
        {
            [config.clinicalLapis.lineageField]: analysis.variant,
        },
        analysis.minProportion,
        analysis.minCount,
        analysis.minJaccard,
        getLapisFilterForTimeFrame(analysis.timeFrame, config.clinicalLapis.dateField),
    );
    return {
        type: 'mutations',
        displayMutations: mutationsWithScore.map(({ mutation }) => mutation),
        customColumns: [
            {
                header: 'Jaccard index',
                values: Object.fromEntries(
                    mutationsWithScore.map(({ mutation, jaccardIndex }) => [mutation, jaccardIndex.toPrecision(2)]),
                ),
            },
        ],
    };
}

async function fetchVariantPredefinedModeData(
    config: WasapPageConfig,
    analysis: WasapVariantFilter,
): Promise<WasapMutationsData> {
    if (!config.variantAnalysisModeEnabled) {
        throw Error("Cannot fetch data, 'variant' mode is not enabled.");
    }
    if (analysis.collectionId === undefined) {
        throw new Error('No collection selected for predefined variant mode.');
    }
    const collection = await getGenSpectrumCollection(getApiServiceForClientside(), String(analysis.collectionId));

    // These names match the variant names hardcoded in the collection seeder.
    let variantName: string;
    if (analysis.sequenceType === 'nucleotide') {
        variantName = analysis.newMutationsOnly ? 'New nucleotide substitutions' : 'Nucleotide substitutions';
    } else {
        variantName = analysis.newMutationsOnly ? 'New amino acid substitutions' : 'Amino acid substitutions';
    }

    const variant = collection.variants.find((v) => v.name === variantName);
    if (!variant) {
        throw new Error(`Variant "${variantName}" not found in collection ${collection.id}.`);
    }
    if (variant.type !== 'filterObject') {
        throw new Error(`Variant "${variantName}" in collection ${collection.id} is not a filterObject variant.`);
    }

    const mutations =
        analysis.sequenceType === 'nucleotide'
            ? (variant.filterObject.nucleotideMutations ?? [])
            : (variant.filterObject.aminoAcidMutations ?? []);

    const lineageForJaccard = analysis.includeSublineagesForJaccard !== false ? `${collection.name}*` : collection.name;
    const jaccardByMutation = await getJaccardForMutations(
        config.clinicalLapis.lapisBaseUrl,
        analysis.sequenceType,
        { [config.clinicalLapis.lineageField]: lineageForJaccard },
        getLapisFilterForTimeFrame(analysis.timeFrame, config.clinicalLapis.dateField),
    );

    if (jaccardByMutation.size === 0) {
        return { type: 'mutations', displayMutations: mutations, lineageForJaccard };
    }

    return {
        type: 'mutations',
        lineageForJaccard,
        displayMutations: mutations.filter((m) => (jaccardByMutation.get(m) ?? 0) >= analysis.minJaccard),
        customColumns: [
            {
                header: 'Jaccard index',
                values: Object.fromEntries(
                    mutations
                        .filter(
                            (m) => jaccardByMutation.has(m) && (jaccardByMutation.get(m) ?? 0) >= analysis.minJaccard,
                        )

                        .map((m) => [m, jaccardByMutation.get(m)!.toPrecision(2)]),
                ),
            },
        ],
    };
}

function fetchResistanceModeData(
    displayMutationsBySet: Record<string, string[]>,
    analysis: WasapResistanceFilter,
): WasapMutationsData {
    return {
        type: 'mutations',
        displayMutations: displayMutationsBySet[analysis.resistanceSet] ?? [],
    };
}

async function fetchUntrackedModeData(
    config: WasapPageConfig,
    analysis: WasapUntrackedFilter,
): Promise<WasapMutationsData> {
    if (!config.untrackedAnalysisModeEnabled) {
        throw Error("Cannot fetch data, 'untracked' mode is not enabled.");
    }
    const variantsToExclude =
        analysis.excludeSet === 'custom'
            ? analysis.excludeVariants
            : await getCladeLineages(
                  config.clinicalLapis.lapisBaseUrl,
                  config.clinicalLapis.cladeField,
                  config.clinicalLapis.lineageField,
                  true,
              ).then((r) => Object.values(r));
    if (variantsToExclude === undefined) {
        return { type: 'mutations', displayMutations: [] };
    }
    const [excludeMutations, allMuts] = await Promise.all([
        Promise.all(
            variantsToExclude.map((variant) =>
                getMutations(
                    config.clinicalLapis.lapisBaseUrl,
                    analysis.sequenceType,
                    {
                        [config.clinicalLapis.lineageField]: variant,
                    },
                    0.8,
                    9,
                ),
            ),
        ).then((r) => r.flat()),
        getMutations(config.lapisBaseUrl, analysis.sequenceType, undefined, 0.05, 5),
    ]);
    return {
        type: 'mutations',
        displayMutations: allMuts.filter((m) => !excludeMutations.includes(m)),
    };
}

async function fetchCovSpectrumCollectionModeData(
    config: WasapPageConfig,
    analysis: WasapCovSpectrumCollectionFilter,
): Promise<WasapCollectionData> {
    if (!config.covSpectrumCollectionAnalysisModeEnabled) {
        throw Error("Cannot fetch data, 'covSpectrumCollection' mode is not enabled.");
    }
    if (analysis.collectionId === undefined) {
        throw Error('No collection selected');
    }
    const collection = await getCollection(config.collectionsApiBaseUrl, analysis.collectionId);

    const { variantData, invalidVariants } = extractCovSpectrumVariantData(collection.variants);
    const { queries, invalidVariants: parseInvalidVariants } = await parseAndBuildQueries(
        config.lapisBaseUrl,
        variantData,
    );
    const allInvalidVariants = [...invalidVariants, ...parseInvalidVariants];

    return {
        type: 'collection',
        collection: {
            id: collection.id,
            title: collection.title,
            queries: deduplicateLabels(queries),
        },
        ...(allInvalidVariants.length > 0 && { invalidVariants: allInvalidVariants }),
    };
}

async function fetchCollectionModeData(
    config: WasapPageConfig,
    analysis: WasapCollectionFilter,
): Promise<WasapCollectionData> {
    if (!config.collectionAnalysisModeEnabled) {
        throw Error("Cannot fetch data, 'collection' mode is not enabled.");
    }
    if (analysis.collectionId === undefined) {
        throw Error('No collection selected');
    }
    const collection = await getGenSpectrumCollection(getApiServiceForClientside(), String(analysis.collectionId));

    const { variantData, invalidVariants } = extractBackendVariantData(collection.variants);
    const { queries, invalidVariants: parseInvalidVariants } = await parseAndBuildQueries(
        config.lapisBaseUrl,
        variantData,
    );
    const allInvalidVariants = [...invalidVariants, ...parseInvalidVariants];

    return {
        type: 'collection',
        collection: { id: collection.id, title: collection.name, queries: deduplicateLabels(queries) },
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
 * genome-only expression the SILO grid asks) to use with `GsQueriesOverTime`.
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

export function getLapisFilterForTimeFrame(timeFrame: VariantTimeFrame, dateFieldName: string): LapisFilter {
    let fromDate = undefined;
    switch (timeFrame) {
        case 'all':
            break;
        case '6months':
            fromDate = dayjs().subtract(6, 'month').format('YYYY-MM-DD');
            break;
        case '3months':
            fromDate = dayjs().subtract(3, 'month').format('YYYY-MM-DD');
            break;
    }
    if (fromDate === undefined) {
        return {};
    }
    return {
        [`${dateFieldName}From`]: fromDate,
    };
}

/**
 * The W-ASAP page data can be either mutations data or collection data.
 */
export type WasapPageData = WasapMutationsData | WasapCollectionData;

/**
 * Mutations data consists of the mutations to display in the mutations-over-time component,
 * and the additional custom columns that might optionally be displayed.
 *
 * If displayMutations is undefined, that means that all mutations should be displayed
 * (That is the default behaviour of the mutations-over-time component).
 */
export type WasapMutationsData = {
    type: 'mutations';
    displayMutations?: string[];
    customColumns?: CustomColumn[];
    lineageForJaccard?: string;
};

/**
 * Name of the invalid variant, and the error (why it's not valid).
 */
type InvalidVariantInfo = {
    name: string;
    error: string;
};

/**
 * Collection data consists of a collection with its variants.
 */
export type WasapCollectionData = {
    type: 'collection';
    collection: {
        id: number;
        title: string;
        queries: QueriesOverTimeQuery[];
    };
    invalidVariants?: InvalidVariantInfo[];
};
