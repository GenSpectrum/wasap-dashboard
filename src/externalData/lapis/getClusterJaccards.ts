import { queryOptions, skipToken, useQuery, type UseQueryResult } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { z } from 'zod';

import { lapisPost } from './http';

/** Where the clinical sequences are, and which lineage the Jaccard indices are of. */
export type ClusterJaccardSource = {
    lapisBaseUrl: string;
    /** The lineage as an advanced query, `nextcladePangoLineage=XFG*`. */
    lineageQuery: string;
    dateField: string;
    /** Only the sequences from this day on (`YYYY-MM-DD`); all without. */
    dateFrom: string | undefined;
};

/** The sequences with at least `atLeast` of the mutations `codes`: all of them, `[3-of: …]` with fewer. */
export type ClusterQuery = { codes: readonly string[]; atLeast: number };

/** Before any sequence; the endpoint needs a date range with both ends. */
const EARLIEST_DATE = '1900-01-01';

const queriesOverTimeResponseSchema = z.object({
    data: z.object({
        data: z.array(z.array(z.object({ count: z.number(), coverage: z.number() }))),
    }),
});

/**
 * The query of `getClusterJaccards`, for `useQuery` / `useQueries`; skipped without a `source` or
 * clusters. Never stale.
 */
export function clusterJaccardsQuery(source: ClusterJaccardSource | undefined, clusters: readonly ClusterQuery[]) {
    return queryOptions({
        queryKey: ['lapis', 'cluster-jaccards', source, clusters],
        staleTime: Infinity,
        queryFn:
            source === undefined || clusters.length === 0
                ? skipToken
                : ({ signal }) => getClusterJaccards(source, clusters, signal),
    });
}

export function useClusterJaccards(
    source: ClusterJaccardSource | undefined,
    clusters: readonly ClusterQuery[],
): UseQueryResult<(number | undefined)[]> {
    return useQuery(clusterJaccardsQuery(source, clusters));
}

/**
 * The Jaccard index of the lineage and each cluster (the sequences with all of its mutations, or
 * at least `atLeast` of them), in the order of `clusters`: like that of a single mutation (`getMutationsForVariant`), with the
 * cluster in its place.
 *
 * All of them from one request to LAPIS's `queriesOverTime`, over one date range: per cluster, the
 * sequences of the lineage with the cluster as the count, and all those with the cluster as the
 * coverage, and the lineage's own sequences as one more query. One request instead of two per
 * cluster: a few seconds for fifty clusters, against about four times that.
 *
 * The date range leaves out the sequences without a date, so these indices can be a little off
 * those of `getMutationsForVariant`, which take them in.
 *
 * Without any sequences of the lineage, the indices are unknown (`undefined`), not 0: they say
 * nothing about how specific the clusters are to it, and mustn't get them left out.
 */
export async function getClusterJaccards(
    source: ClusterJaccardSource,
    clusters: readonly ClusterQuery[],
    signal?: AbortSignal,
): Promise<(number | undefined)[]> {
    return (await getClusterJaccardsWithLineageCount(source, clusters, signal)).jaccards;
}

/** `getClusterJaccards`, with the number of sequences of the lineage, which none of them are of when it is 0. */
export async function getClusterJaccardsWithLineageCount(
    source: ClusterJaccardSource,
    clusters: readonly ClusterQuery[],
    signal?: AbortSignal,
): Promise<{ lineageCount: number; jaccards: (number | undefined)[] }> {
    const { lapisBaseUrl, lineageQuery, dateField, dateFrom } = source;
    const queries = [
        { countQuery: lineageQuery, coverageQuery: lineageQuery },
        ...clusters.map(({ codes, atLeast }) => {
            const cluster = atLeast < codes.length ? `[${atLeast}-of: ${codes.join(', ')}]` : codes.join(' & ');
            return { countQuery: `${lineageQuery} & ${cluster}`, coverageQuery: cluster };
        }),
    ];
    const response = await lapisPost(
        lapisBaseUrl,
        '/component/queriesOverTime',
        {
            filters: {},
            queries,
            dateRanges: [{ dateFrom: dateFrom ?? EARLIEST_DATE, dateTo: dayjs().format('YYYY-MM-DD') }],
            dateField,
        },
        queriesOverTimeResponseSchema,
        'the Jaccard indices of the clusters',
        signal,
    );
    const counts = response.data.data.map(([range]) => range);

    const lineageCount = counts[0].count;
    // The union is never empty with sequences of the lineage, so no 0 / 0.
    const jaccards = counts.slice(1).map(({ count: both, coverage: withCluster }) =>
        // https://en.wikipedia.org/wiki/Jaccard_index#Overview
        lineageCount === 0 ? undefined : both / (lineageCount + withCluster - both),
    );
    return { lineageCount, jaccards };
}
