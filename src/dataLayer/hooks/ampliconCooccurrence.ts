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
 * mutations, and the reads that carry at least `atLeast` of these mutations.
 */
export type CooccurrenceRow = AmpliconMutations & {
    /** The mutations of the cluster, a subset of the amplicon's `mutations`. */
    cluster: AmpliconMutation[];
    /**
     * How many of the cluster's mutations a read (or clinical sequence) has to carry to count: all
     * of them, but in the rows of any all but one or two of an amplicon's mutations.
     */
    atLeast: number;
    /** Unique; the row's key in the table. */
    label: string;
    /** Per date bucket (index-aligned with the date axis): the reads with at least `atLeast` of the cluster's mutations. */
    values: ProportionValue[];
};

/**
 * An amplicon's co-occurrence rows, as they belong together: the row of all of its mutations, which
 * the others are compared to.
 */
export type AmpliconRows = {
    /** All of the amplicon's mutations together: the variant's signature on the amplicon. */
    all: CooccurrenceRow;
    /** Any all but one, and any all but two, of the mutations, each with the clusters of that many of them. */
    anyOf: { row: CooccurrenceRow; clusters: CooccurrenceRow[] }[];
    /** The other combinations of two or more of the mutations that reads carry. */
    observed: CooccurrenceRow[];
    /** Each mutation on its own, in genome order. */
    singles: CooccurrenceRow[];
};

/** All of an amplicon's rows, in the order of the tree. */
export function allRowsOf({ all, anyOf, observed, singles }: AmpliconRows): CooccurrenceRow[] {
    return [all, ...anyOf.flatMap(({ row, clusters }) => [row, ...clusters]), ...observed, ...singles];
}

/** Whether a row counts the reads with any `atLeast` of its cluster's mutations, rather than all of them. */
export function isAnyOf(row: CooccurrenceRow): boolean {
    return row.atLeast < row.cluster.length;
}

/**
 * Up to this many mutations, an amplicon gets the rows leaving out two of them as well: one per
 * pair of them, 66 for 12.
 */
export const MAX_MUTATIONS_TO_LEAVE_TWO_OUT = 12;

/**
 * The rows of the co-occurrence table, per amplicon (exported for tests).
 *
 * The cluster of all of the amplicon's mutations (whether reads carry it or not), and those leaving
 * one or two of them out (`anyOfRows`). Then the other combinations of two or more of them that
 * reads carry exactly, on at least `MIN_CLUSTER_SHARE` of its spanning reads: the combinations that
 * are there, rather than every subset of the mutations, the largest first. And each mutation on its
 * own: on the same reads as the others, to compare them to. A row's values count the reads that
 * carry at least the cluster's mutations (those with more of the amplicon's mutations as well,
 * too), out of the reads spanning all of their positions.
 */
export function cooccurrenceRows(cooccurrences: AmpliconCooccurrence[], totalReads: number[]): AmpliconRows[] {
    return cooccurrences.map((cooccurrence) => {
        const { mutations, spanning, combinations } = cooccurrence;
        const anyOf = [anyOfRows(cooccurrence, 1, totalReads), anyOfRows(cooccurrence, 2, totalReads)].flatMap(
            (rows) => (rows === undefined ? [] : [rows]),
        );
        // A combination seen on reads can be one of those leaving one or two out: it is there once, with them.
        const leavingOut = new Set(anyOf.flatMap(({ clusters }) => clusters.map((row) => row.label)));

        const totalSpanning = spanning.reduce((sum, count) => sum + count, 0);
        const size = (combination: MutationCombination) => combination.carries.filter(Boolean).length;
        const observed = combinations
            .filter(
                (combination) =>
                    size(combination) >= 2 &&
                    size(combination) < mutations.length &&
                    combination.total > 0 &&
                    combination.total >= MIN_CLUSTER_SHARE * totalSpanning,
            )
            .sort((a, b) => size(b) - size(a) || b.total - a.total)
            .map(({ carries }) => mutations.filter((_, index) => carries[index]))
            .map((cluster) => clusterRow(cooccurrence, cluster, cluster.length, totalReads))
            .filter((row) => !leavingOut.has(row.label));

        return {
            all: clusterRow(cooccurrence, mutations, mutations.length, totalReads),
            anyOf,
            observed,
            singles: mutations.map((mutation) => clusterRow(cooccurrence, [mutation], 1, totalReads)),
        };
    });
}

/**
 * The rows that tell how much the mutations matter to an amplicon's cluster of all of them, leaving
 * `out` of them out: any all but `out` of them (`≥3 of 4`), with each cluster of all but `out` of
 * them, by the mutations left out, in genome order. None where that leaves less than two mutations
 * (no co-occurrence), nor for leaving two out of more than `MAX_MUTATIONS_TO_LEAVE_TWO_OUT`.
 */
function anyOfRows(
    cooccurrence: AmpliconCooccurrence,
    out: 1 | 2,
    totalReads: number[],
): AmpliconRows['anyOf'][number] | undefined {
    const { mutations } = cooccurrence;
    const atLeast = mutations.length - out;
    if (atLeast < 2 || (out === 2 && mutations.length > MAX_MUTATIONS_TO_LEAVE_TWO_OUT)) {
        return undefined;
    }
    const leftOut =
        out === 1
            ? mutations.map((mutation) => [mutation])
            : mutations.flatMap((first, index) => mutations.slice(index + 1).map((second) => [first, second]));
    return {
        row: clusterRow(cooccurrence, mutations, atLeast, totalReads),
        clusters: leftOut.map((left) =>
            clusterRow(
                cooccurrence,
                mutations.filter((mutation) => !left.includes(mutation)),
                atLeast,
                totalReads,
            ),
        ),
    };
}

function clusterRow(
    { amplicon, mutations, spanning, combinations }: AmpliconCooccurrence,
    cluster: AmpliconMutation[],
    atLeast: number,
    totalReads: number[],
): CooccurrenceRow {
    const indices = cluster.map((mutation) => mutations.indexOf(mutation));
    const carrying = combinations.filter(
        (combination) => indices.filter((index) => combination.carries[index]).length >= atLeast,
    );
    const codes = cluster.map((mutation) => mutation.code);
    return {
        amplicon,
        mutations,
        cluster,
        atLeast,
        label: `Amplicon ${amplicon.number}: ${atLeast < cluster.length ? `≥${atLeast} of ${codes.join(', ')}` : codes.join(' + ')}`,
        values: totalReads.map((total, bucket) =>
            proportionValue(
                carrying.reduce((sum, combination) => sum + combination.counts[bucket], 0),
                spanning[bucket],
                total,
            ),
        ),
    };
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
