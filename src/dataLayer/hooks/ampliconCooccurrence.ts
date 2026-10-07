/**
 * Which of an amplicon's mutations occur together on one read, over time.
 *
 * A read comes from one amplicon, so the mutations of a variant that fall into the same amplicon
 * can be checked for being on the same read — which the per-mutation proportions of the mutations
 * grid can't tell: 30% C→T at one position and 30% A→G at another can be one variant carrying both,
 * or two carrying one each.
 *
 * One query per amplicon with at least two of the mutations, at two or more positions
 * (`haplotypesOverTimeQuery`): the symbols every read carries at those positions, per day. Only
 * the reads that called a symbol at all of them count (the rest end or have an `N` somewhere in
 * between); each is sorted into the combination of the mutations it carries.
 */

import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { allQueryData } from './allQueryData';
import { useConnection, useSiloSchema } from './connection';
import { unknownSymbol } from './mutationsOverTime';
import { type AmpliconMutation, type AmpliconMutations } from '../../amplicons/mutationsByAmplicon';
import { type ProportionValue } from '../../components/dataDisplay/overTime/proportionValue';
import { type TemporalGranularity } from '../../types/dashboardComponents';
import { type Map2DContents } from '../../util/map2d';
import { parseDateStringToTemporal, type Temporal, type TemporalClass } from '../../util/temporalClass';
import { haplotypesOverTimeQuery, readHaplotypesOverTime, type HaplotypeOverTimeRow } from '../queries';

/** Reads with one particular set of the amplicon's mutations. */
export type MutationCombination = {
    /** Per mutation of the amplicon (index-aligned): whether the reads carry it. */
    carries: boolean[];
    /** Per bucket. */
    counts: number[];
    total: number;
};

export type AmpliconCooccurrence = AmpliconMutations & {
    /** Per bucket: the reads with a call at every position of the mutations. */
    spanning: number[];
    /** Every combination that occurs, the most reads first. */
    combinations: MutationCombination[];
};

export type AmpliconCooccurrenceResult = {
    /** Per amplicon with co-occurrence to measure, in genome order; undefined until all have answered. */
    data: AmpliconCooccurrence[] | undefined;
    error: Error | undefined;
};

/** Whether an amplicon has anything that could co-occur: mutations at two positions or more. */
function hasCooccurrence({ mutations }: AmpliconMutations): boolean {
    return new Set(mutations.map((mutation) => mutation.position)).size >= 2;
}

export function useAmpliconCooccurrence(
    locationName: string | undefined,
    groups: AmpliconMutations[],
    dateRanges: TemporalClass[],
    granularity: TemporalGranularity,
): AmpliconCooccurrenceResult {
    const connection = useConnection();
    const schema = useSiloSchema();
    const measured = useMemo(() => groups.filter(hasCooccurrence), [groups]);

    const haplotypes = useQueries({
        combine: allQueryData,
        queries: measured.map((group) => {
            const positions = positionsOf(group.mutations);
            // `schema` stands in for `connection.key` (same memoized SiloInstance).
            // eslint-disable-next-line @tanstack/query/exhaustive-deps
            return {
                queryKey: [
                    'silo',
                    'haplotypes-over-time',
                    ...connection.key,
                    locationName ?? null,
                    schema.nucleotideSequence,
                    positions,
                ],
                staleTime: Infinity,
                queryFn: async ({ signal }: { signal: AbortSignal }) => {
                    const { rows } = await connection.query(
                        haplotypesOverTimeQuery(schema, { locationName }, schema.nucleotideSequence, positions),
                        `Haplotypes over time at ${positions.join(', ')}`,
                        { signal },
                    );
                    return readHaplotypesOverTime(rows, schema.groupingDate, positions);
                },
            };
        }),
    });

    const rowsByGroup = haplotypes.data;
    const data = useMemo(
        () =>
            rowsByGroup &&
            measured.map((group, index) =>
                buildAmpliconCooccurrence(group, rowsByGroup[index], dateRanges, granularity),
            ),
        [measured, rowsByGroup, dateRanges, granularity],
    );

    return { data, error: haplotypes.error };
}

/** The distinct positions of the mutations, ascending: the query's symbol columns. */
function positionsOf(mutations: readonly AmpliconMutation[]): number[] {
    return [...new Set(mutations.map((mutation) => mutation.position))].sort((a, b) => a - b);
}

/** Sorts the reads of one amplicon into combinations of its mutations, per bucket (exported for tests). */
export function buildAmpliconCooccurrence(
    group: AmpliconMutations,
    rows: readonly HaplotypeOverTimeRow[],
    dateRanges: TemporalClass[],
    granularity: TemporalGranularity,
): AmpliconCooccurrence {
    const unknown = unknownSymbol('nucleotide');
    const positions = positionsOf(group.mutations);
    const columnOf = group.mutations.map((mutation) => positions.indexOf(mutation.position));
    const alternateOf = group.mutations.map(alternateSymbol);
    const bucketIndexByKey = new Map(dateRanges.map((bucket, index) => [bucket.dateString, index]));

    const spanning = new Array<number>(dateRanges.length).fill(0);
    const byKey = new Map<string, MutationCombination>();
    for (const row of rows) {
        const bucketIndex = bucketIndexByKey.get(parseDateStringToTemporal(row.date, granularity).dateString);
        const called = row.symbols.every((symbol) => symbol !== null && symbol !== '' && symbol !== unknown);
        if (bucketIndex === undefined || !called) {
            continue;
        }
        spanning[bucketIndex] += row.count;
        const carries = columnOf.map((column, index) => row.symbols[column]?.toUpperCase() === alternateOf[index]);
        const key = carries.map((carried) => (carried ? '1' : '0')).join('');
        let combination = byKey.get(key);
        if (combination === undefined) {
            combination = { carries, counts: new Array<number>(dateRanges.length).fill(0), total: 0 };
            byKey.set(key, combination);
        }
        combination.counts[bucketIndex] += row.count;
        combination.total += row.count;
    }

    const combinations = [...byKey.values()].sort((a, b) => b.total - a.total);
    return { ...group, spanning, combinations };
}

function alternateSymbol(mutation: AmpliconMutation): string | undefined {
    return mutation.type === 'deletion' ? '-' : mutation.substitutionValue?.toUpperCase();
}

/**
 * A combination of mutations seen on less than this share of the reads spanning its amplicon's
 * mutations is not made a cluster of its own.
 */
export const MIN_CLUSTER_SHARE = 0.01;

/**
 * One row of the co-occurrence table: a cluster, a combination of two or more of an amplicon's
 * mutations that reads carry together, and the reads that carry at least these mutations.
 */
export type CooccurrenceRow = AmpliconMutations & {
    /** The mutations of the cluster, a subset of the amplicon's `mutations`. */
    cluster: AmpliconMutation[];
    /** Unique; the row's key in the table. */
    label: string;
    /** Per date bucket (index-aligned with the date axis): the reads with at least the cluster's mutations. */
    values: ProportionValue[];
};

/**
 * The rows of the co-occurrence table (exported for tests).
 *
 * The clusters are the combinations of two or more of an amplicon's mutations that reads carry
 * exactly, on at least `MIN_CLUSTER_SHARE` of its spanning reads: the combinations that are there,
 * rather than every subset of the mutations. A row's values count the reads that carry at least the
 * cluster's mutations (those with more of the amplicon's mutations as well, too), out of the reads
 * spanning all of their positions. Per amplicon, the largest clusters come first.
 */
export function cooccurrenceRows(cooccurrences: AmpliconCooccurrence[], totalReads: number[]): CooccurrenceRow[] {
    return cooccurrences.flatMap(({ amplicon, mutations, spanning, combinations }) => {
        const totalSpanning = spanning.reduce((sum, count) => sum + count, 0);
        const size = (combination: MutationCombination) => combination.carries.filter(Boolean).length;
        const clusters = combinations
            .filter(
                (combination) =>
                    size(combination) >= 2 &&
                    combination.total > 0 &&
                    combination.total >= MIN_CLUSTER_SHARE * totalSpanning,
            )
            .sort((a, b) => size(b) - size(a) || b.total - a.total);
        return clusters.map(({ carries }) => {
            const cluster = mutations.filter((_, index) => carries[index]);
            const carrying = combinations.filter((other) =>
                carries.every((carried, index) => !carried || other.carries[index]),
            );
            return {
                amplicon,
                mutations,
                cluster,
                label: `Amplicon ${amplicon.number}: ${cluster.map((mutation) => mutation.code).join(' + ')}`,
                values: totalReads.map((total, bucket) =>
                    proportionValue(
                        carrying.reduce((sum, combination) => sum + combination.counts[bucket], 0),
                        spanning[bucket],
                        total,
                    ),
                ),
            };
        });
    });
}

/** The rows as the feature bands take them: by label, then by date bucket. */
export function cooccurrenceTableData(
    rows: readonly CooccurrenceRow[],
    dateRanges: readonly TemporalClass[],
): Map2DContents<string, Temporal, ProportionValue> {
    return {
        keysFirstAxis: new Map(rows.map((row) => [row.label, row.label])),
        keysSecondAxis: new Map(dateRanges.map((bucket) => [bucket.dateString, bucket])),
        data: new Map(
            rows.map((row) => [
                row.label,
                new Map(dateRanges.map((bucket, index) => [bucket.dateString, row.values[index]])),
            ]),
        ),
    };
}

function proportionValue(count: number, spanning: number, totalReads: number): ProportionValue {
    if (totalReads === 0) {
        return null;
    }
    if (spanning === 0) {
        return { type: 'noCoverage', totalCount: totalReads };
    }
    return { type: 'value', count, coverage: spanning, totalCount: totalReads };
}
