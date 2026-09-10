/**
 * The minimal LAPIS client for the one read that stays on clinical LAPIS: the
 * lineage / variant picker.
 *
 * The lineage picker in `variant` / `untracked` mode filters the *wastewater*
 * dataset but reads its lineage list from the **clinical** LAPIS — someone
 * else's dataset, which has no SILO. That is the deliberate "wart" in doc 04:
 * one component reading from LAPIS while every other reads from SILO, through
 * the same client-in-context → data-hook mechanism.
 *
 * Just the two calls that read need — an aggregate over one field for the
 * counts, and the lineage-definition DAG — wrapping the kept `lapisApi`
 * functions. Everything else in `lapisApi` is on the SILO chopping block.
 */

import { fetchAggregated, fetchLineageDefinition } from '../lapisApi/lapisApi';
import type { LineageDefinitionResponse } from '../lapisApi/LineageDefinition';

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
