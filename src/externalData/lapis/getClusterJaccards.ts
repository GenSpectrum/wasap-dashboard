import dayjs from 'dayjs';
import { z } from 'zod';

import { lapisPost } from '../lapisApi/lapisApi';

/** Where the clinical sequences are, and which lineage the Jaccard indices are of. */
export type ClusterJaccardSource = {
    lapisBaseUrl: string;
    /** The lineage as an advanced query, `nextcladePangoLineage=XFG*`. */
    lineageQuery: string;
    dateField: string;
    /** Only the sequences from this day on (`YYYY-MM-DD`); all without. */
    dateFrom: string | undefined;
};

/** Before any sequence; the endpoint needs a date range with both ends. */
const EARLIEST_DATE = '1900-01-01';

const queriesOverTimeResponseSchema = z.object({
    data: z.object({
        data: z.array(z.array(z.object({ count: z.number(), coverage: z.number() }))),
    }),
});

/**
 * The Jaccard index of the lineage and each cluster (the sequences with all of its mutations), in
 * the order of `clusters`: like that of a single mutation (`getMutationsForVariant`), with the
 * cluster in its place.
 *
 * All of them from one request to LAPIS's `queriesOverTime`, over one date range: per cluster, the
 * sequences of the lineage with the cluster as the count, and all those with the cluster as the
 * coverage, and the lineage's own sequences as one more query. One request instead of two per
 * cluster: a few seconds for fifty clusters, against about four times that.
 *
 * The date range leaves out the sequences without a date, so these indices can be a little off
 * those of the single mutations, which take them in.
 */
export async function getClusterJaccards(
    source: ClusterJaccardSource,
    clusters: readonly (readonly string[])[],
    signal?: AbortSignal,
): Promise<number[]> {
    const { lapisBaseUrl, lineageQuery, dateField, dateFrom } = source;
    const queries = [
        { countQuery: lineageQuery, coverageQuery: lineageQuery },
        ...clusters.map((codes) => {
            const cluster = codes.join(' & ');
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
    return counts.slice(1).map(({ count: both, coverage: withCluster }) => {
        const union = lineageCount + withCluster - both;
        // https://en.wikipedia.org/wiki/Jaccard_index#Overview
        return union === 0 ? 0 : both / union;
    });
}
