/**
 * The frequency of each of a list of mutations in each sample in scope, from the base counts at
 * their positions (`symbolsBySampleQuery`, `POSITIONS_PER_QUERY` positions per query — see there
 * for why batched, and what one could do instead).
 *
 * A mutation's frequency in a sample is the reads with its base over the reads with any base or a
 * deletion there, as LolliPop computes it from a V-pipe base count. Samples where fewer than
 * `MIN_COVERAGE` reads cover the position have no frequency for it: a frequency from a couple of
 * reads (often PCR copies of one genome) is noise.
 */

import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConnection, useSiloSchema } from './connection';
import {
    normalizeFilter,
    POSITIONS_PER_QUERY,
    readSymbolsBySample,
    symbolsBySampleQuery,
    type SiloReadFilter,
    type SymbolsBySampleRow,
} from '../queries';

export const MIN_COVERAGE = 20;

const COVERING_SYMBOLS = new Set(['A', 'C', 'G', 'T', '-']);

export type SampleMutationFrequency = {
    sampleId: string;
    /** ISO `yyyy-mm-dd`, the sampling date. */
    date: string;
    /** Like `C241T`. */
    mutation: string;
    frac: number;
    /** The reads covering the position. */
    coverage: number;
};

export type MutationFrequenciesResult = {
    /** Once every position is answered. */
    data: SampleMutationFrequency[] | undefined;
    error: Error | undefined;
};

export function useMutationFrequencies(
    filter: SiloReadFilter,
    mutations: readonly string[],
): MutationFrequenciesResult {
    const connection = useConnection();
    const schema = useSiloSchema();
    const scope = normalizeFilter(filter);
    const batches = useMemo(() => {
        const positions = [...new Set(mutations.map(positionOf))].sort((a, b) => a - b);
        return Array.from({ length: Math.ceil(positions.length / POSITIONS_PER_QUERY) }, (_, i) =>
            positions.slice(i * POSITIONS_PER_QUERY, (i + 1) * POSITIONS_PER_QUERY),
        );
    }, [mutations]);

    const results = useQueries({
        queries: batches.map((positions) => {
            // `schema` stands in for `connection.key` (same memoized SiloInstance).
            // eslint-disable-next-line @tanstack/query/exhaustive-deps
            return {
                queryKey: ['silo', 'symbols-by-sample', ...connection.key, scope, schema.nucleotideSequence, positions],
                staleTime: Infinity,
                queryFn: async ({ signal }: { signal: AbortSignal }) => {
                    const { rows } = await connection.query(
                        symbolsBySampleQuery(schema, scope, schema.nucleotideSequence, positions),
                        `Symbols at ${positions.length} positions by sample`,
                        { signal },
                    );
                    return readSymbolsBySample(rows, schema, positions);
                },
            };
        }),
    });

    const answered = results.filter((result) => result.data !== undefined).length;
    const answeredKey = results.map((result) => result.dataUpdatedAt).join();
    const data = useMemo(() => {
        if (answered < batches.length) {
            return undefined;
        }
        const rowsByPosition = new Map(results.flatMap((result) => [...result.data!]));
        return mutationFrequencies(mutations, rowsByPosition);
        // `answeredKey` stands in for `results`, which is a new array every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [answered, answeredKey, batches, mutations]);

    return {
        data,
        error: results.find((result) => result.error)?.error ?? undefined,
    };
}

/** The frequencies from the base counts of each position (exported for tests). */
export function mutationFrequencies(
    mutations: readonly string[],
    rowsByPosition: ReadonlyMap<number, readonly SymbolsBySampleRow[]>,
): SampleMutationFrequency[] {
    const result: SampleMutationFrequency[] = [];
    for (const mutation of mutations) {
        const base = mutation.at(-1);
        const samples = new Map<string, { date: string; coverage: number; count: number }>();
        for (const row of rowsByPosition.get(positionOf(mutation)) ?? []) {
            const sample = samples.get(row.sampleId) ?? { date: row.date, coverage: 0, count: 0 };
            samples.set(row.sampleId, sample);
            if (row.sym !== null && COVERING_SYMBOLS.has(row.sym)) {
                sample.coverage += row.count;
            }
            if (row.sym === base) {
                sample.count += row.count;
            }
        }
        for (const [sampleId, { date, coverage, count }] of samples) {
            if (coverage >= MIN_COVERAGE) {
                result.push({ sampleId, date, mutation, frac: count / coverage, coverage });
            }
        }
    }
    return result;
}

function positionOf(mutation: string): number {
    return Number(mutation.slice(1, -1));
}
