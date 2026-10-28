/**
 * A LAPIS client in React context (`LapisClientContext`), for the lineage / variant picker: the
 * picker in `variant` / `untracked` mode filters the wastewater dataset, but reads its lineage list
 * from the clinical LAPIS.
 *
 * Just the two calls the picker needs — an aggregate over one field for the counts, and the
 * lineage-definition DAG — wrapping the functions in `http.ts`. The other LAPIS reads in this
 * folder take the URL and call `http.ts` directly.
 */

import type { LineageDefinitionResponse } from './LineageDefinition';
import { fetchAggregated, fetchLineageDefinition } from './http';

export type FieldCount = { value: string; count: number };

export type LapisClient = {
    readonly url: string;
    /** `count` per distinct value of `field`, over the whole dataset. */
    aggregate(field: string, options?: { signal?: AbortSignal }): Promise<FieldCount[]>;
    /** The lineage-definition DAG for `field` (`parents` / `aliases` per lineage). */
    lineageDefinition(field: string, options?: { signal?: AbortSignal }): Promise<LineageDefinitionResponse>;
};

export function lapisClient(url: string): LapisClient {
    const base = url.endsWith('/') ? url.slice(0, -1) : url;
    return {
        url: base,
        aggregate: async (field, options) => {
            const { data } = await fetchAggregated(base, { fields: [field] }, options?.signal);
            return data
                .map((row) => ({ value: row[field], count: row.count }))
                .filter((entry): entry is FieldCount => typeof entry.value === 'string');
        },
        lineageDefinition: (field, options) =>
            fetchLineageDefinition({ lapisUrl: base, lapisField: field, signal: options?.signal }),
    };
}
