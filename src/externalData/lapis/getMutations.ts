import { z } from 'zod';

import { getTotalCount } from './getTotalCount';
import { type LapisFilter, type SequenceType } from '../../types/dashboardComponents';
import { lapisPost } from '../lapisApi/lapisApi';

const mutationsSchema = z.object({
    data: z.array(
        z.object({
            mutation: z.string(),
            count: z.number(),
        }),
    ),
});

/**
 * Return nucleotide or amino acid mutations matching certain filter criteria.
 * The underlying request is POST request, but this is still semantically a 'get' operation, hence the name.
 *
 * @param lapisUrl The base API URL
 * @param mutationType nucleotide or amino acid sequences
 * @param lapisFilter only return mutations from sequences matching the filter
 * @param minProportion The relative frequency a mutation needs to have, relative to the total number of
 *      unambiguous reads (matching the given other filters)
 * @param minCount The minimum absolute count a mutation needs to have (after filters are applied) to
 *      be included in the result
 * @returns A list of mutation codes
 */
export async function getMutations(
    lapisUrl: string,
    mutationType: SequenceType,
    lapisFilter: LapisFilter | undefined,
    minProportion: number,
    minCount: number,
    signal?: AbortSignal,
): Promise<string[]> {
    return getMutationsInternal(lapisUrl, mutationType, lapisFilter, minProportion, signal).then((data) =>
        data.filter((item) => item.count >= minCount).map((item) => item.mutation),
    );
}

/**
 * Returns a map from mutation code to Jaccard index for all mutations observed in clinical
 * sequences belonging to the given lineage. Mutations not observed in the lineage are absent
 * from the map.
 *
 * Use this to annotate a pre-defined list of mutations with clinical Jaccard scores without
 * applying any proportion/count/threshold filtering.
 */
export async function getJaccardForMutations(
    lapisUrl: string,
    mutationType: SequenceType,
    lineageFilter: LapisFilter,
    dateFilter: LapisFilter | undefined,
    signal?: AbortSignal,
): Promise<Map<string, number>> {
    return getMutationsForVariant(lapisUrl, mutationType, lineageFilter, 0, 0, 0, dateFilter, signal).then(
        (entries) => new Map(entries.map(({ mutation, jaccardIndex }) => [mutation, jaccardIndex])),
    );
}

/**
 * Returns the list of mutations that are defining this variant, based on the given parameters.
 * The result also includes the Jaccard index for every mutation.
 *
 * @param lineageFilter a `LapisFilter` that filters for a particular lineage.
 */
export async function getMutationsForVariant(
    lapisUrl: string,
    mutationType: SequenceType,
    lineageFilter: LapisFilter,
    minProportion: number,
    minCount: number,
    minJaccardIndex: number,
    dateFilter: LapisFilter | undefined,
    signal?: AbortSignal,
) {
    return Promise.all([
        // sequence counts WITH mutation and WITH lineage
        getMutationsInternal(lapisUrl, mutationType, { ...lineageFilter, ...dateFilter }, minProportion, signal).then(
            (r) => r.filter((item) => item.count >= minCount),
        ),
        // sequence counts WITH mutation (only)
        getMutationsInternal(lapisUrl, mutationType, dateFilter, 0, signal).then((r) =>
            Object.fromEntries(r.map((item) => [item.mutation, item.count])),
        ),
        // sequence count WITH lineage (only)
        getTotalCount(lapisUrl, { ...lineageFilter, ...dateFilter }, signal),
    ]).then(([intersectionCounts, totalCounts, variantCount]) =>
        intersectionCounts
            .map(({ mutation, count }) => {
                if (!Object.hasOwn(totalCounts, mutation)) {
                    throw new Error(
                        `Data inconsistency: mutation ${mutation} observed in lineage but absent from global population query.`,
                    );
                }
                // https://en.wikipedia.org/wiki/Jaccard_index#Overview
                return { mutation, jaccardIndex: count / (variantCount + totalCounts[mutation] - count) };
            })
            .filter(({ jaccardIndex }) => jaccardIndex >= minJaccardIndex),
    );
}

async function getMutationsInternal(
    lapisUrl: string,
    mutationType: SequenceType,
    lapisFilter: LapisFilter | undefined,
    minProportion: number | undefined,
    signal: AbortSignal | undefined,
): Promise<{ mutation: string; count: number }[]> {
    const endpoint = mutationType === 'nucleotide' ? 'nucleotideMutations' : 'aminoAcidMutations';

    const body: Record<string, unknown> = {};
    Object.assign(body, lapisFilter);
    if (minProportion !== undefined) {
        body.minProportion = minProportion;
    }

    const response = await lapisPost(lapisUrl, `/sample/${endpoint}`, body, mutationsSchema, 'mutations', signal);
    return response.data;
}
