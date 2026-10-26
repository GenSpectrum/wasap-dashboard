/**
 * `gs-mutations-over-time` over SILO, in two hooks: one for the grid's frame,
 * one for the cells of whichever page is on screen.
 *
 * `useOverTimeMetadata` — the frame, and page-independent: the date axis +
 * per-bucket read totals, and the sorted mutation list with each row's overall
 * proportion. For a given list of mutations, the proportions are sums over the
 * rows of all their positions, fetched in a few `unionall`s and put into the
 * page's cache; otherwise they come from one `mutations()` call.
 *
 * `useMutationsOverTimePage` — the cells for the *visible page*: one
 * position-over-time query per distinct position of that page's mutations —
 * `group(by := {date, seq.at(pos)}, aggs := {count()})` over the filter — unless the metadata
 * already put it in the cache. Cached per position
 * and filter (`staleTime: Infinity`), so paging, granularity changes and revisits reuse whatever
 * positions are already in hand. The count/coverage
 * matrix is a pure function of those rows (`buildMatrix`).
 */

import { type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { allQueryData } from './allQueryData';
import { useConnection, useSiloQueryClient, useSiloSchema } from './connection';
import { fetchDateAxis } from './dateAxis';
import { useSiloQueries, useSiloQuery } from './siloQuery';
import {
    BaseMutationOverTimeDataMap,
    type MutationOverTimeDataMap,
} from '../../components/dataDisplay/mutationsOverTime/MutationOverTimeData';
import { removeEmptyDatesInPlace, type ProportionValue } from '../../components/dataDisplay/overTime/proportionValue';
import { sortSubstitutionsAndDeletions } from '../../components/shared/sort/sortSubstitutionsAndDeletions';
import { type SubstitutionOrDeletionEntry, type TemporalGranularity } from '../../types/dashboardComponents';
import { Map2dView, type Map2DContents } from '../../util/map2d';
import { DeletionClass, SubstitutionClass, type Deletion, type Substitution } from '../../util/mutations';
import { parseDateStringToTemporal, type Temporal, type TemporalClass } from '../../util/temporalClass';
import {
    overallMutationsQuery,
    normalizeFilter,
    positionOverTimeQuery,
    positionsOverTimeQuery,
    readOverallMutations,
    readPositionOverTime,
    readPositionsOverTime,
    type OverallMutationRow,
    type OverTimeSequenceType,
    type PositionTarget,
    type PositionOverTimeRow,
    type SiloReadFilter,
    type SiloSchema,
} from '../queries';
import { type Connection } from '../transport/connection';

/** The symbol that means "the read did not call anything here". */
export function unknownSymbol(sequenceType: OverTimeSequenceType): string {
    return sequenceType === 'nucleotide' ? 'N' : 'X';
}

// --- metadata: the grid's frame ----------------------------------------------

export type OverTimeMetadata = {
    /** Every bucket in range, gap-filled and sorted. */
    requestedDateRanges: TemporalClass[];
    /** Total reads per bucket, index-aligned with `requestedDateRanges`. */
    totalCountsByBucket: number[];
    /**
     * Mutations above the proportion floor, sorted. If `displayMutations` was given, exactly that
     * set instead, each with its count and proportion over the filter (`overallFromPositions`).
     */
    overallMutations: SubstitutionOrDeletionEntry<Substitution, Deletion>[];
};

export function useOverTimeMetadata(
    filter: SiloReadFilter,
    granularity: TemporalGranularity,
    sequenceType: OverTimeSequenceType,
    displayMutations: string[] | undefined,
    enabled = true,
): UseQueryResult<OverTimeMetadata> {
    const connection = useConnection();
    const schema = useSiloSchema();
    const queryClient = useSiloQueryClient();
    const normalized = normalizeFilter(filter);
    const displayMutationsKey = displayMutations === undefined ? undefined : [...displayMutations].sort();

    // `schema` stands in for `connection.key` (same memoized SiloInstance);
    // `normalized`/`displayMutationsKey` stand in for `filter`/`displayMutations`
    // — they're pure, order-independent derivations of them, deliberately
    // used instead so equivalent filters/sets share a cache entry.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useSiloQuery({
        queryKey: [
            'silo',
            'over-time-metadata',
            ...connection.key,
            normalized,
            granularity,
            sequenceType,
            displayMutationsKey,
        ],
        enabled,
        queryFn: async ({ signal }): Promise<OverTimeMetadata> => {
            // Date axis first: the "too many buckets" guard has to fire before the
            // (potentially expensive) mutation queries.
            const { requestedDateRanges, totalCountsByBucket } = await fetchDateAxis(
                connection,
                schema,
                filter,
                granularity,
                signal,
            );

            if (displayMutations !== undefined) {
                const targets = positionTargets(displayMutations, sequenceType, schema.nucleotideSequence);
                const rowsByPosition = await fetchPositionsOverTime(
                    queryClient,
                    connection,
                    schema,
                    normalized,
                    targets,
                    signal,
                );
                const overallMutations = overallFromPositions(
                    displayMutations,
                    sequenceType,
                    schema.nucleotideSequence,
                    rowsByPosition,
                ).sort((a, b) => sortSubstitutionsAndDeletions(a.mutation, b.mutation));
                return { requestedDateRanges, totalCountsByBucket, overallMutations };
            }

            const mutationRows = await connection
                .query(overallMutationsQuery(schema, normalized, { sequenceType }), 'Over-time mutations', {
                    signal,
                })
                .then((result) => readOverallMutations(result.rows));

            const overallMutations = toMutationEntries(mutationRows, sequenceType);

            return { requestedDateRanges, totalCountsByBucket, overallMutations };
        },
    });
}

/**
 * Positions per `positionsOverTimeQuery`; more go in several, sent at once. The split hardly changes
 * the time; it only keeps a long list from becoming one huge request and response.
 */
const POSITIONS_PER_QUERY = 64;

/**
 * The rows of every target, by `targetKey`: from the cache of the page's position queries
 * (`positionQueryKey`) where they are in it, the others fetched in `positionsOverTimeQuery`s and
 * put into that cache, so that the pages of the grid then need no queries of their own.
 */
async function fetchPositionsOverTime(
    queryClient: QueryClient,
    connection: Connection,
    schema: SiloSchema,
    filter: SiloReadFilter,
    targets: readonly PositionTarget[],
    signal: AbortSignal,
): Promise<Map<string, PositionOverTimeRow[]>> {
    const rowsByPosition = new Map<string, PositionOverTimeRow[]>();
    const missing: PositionTarget[] = [];
    for (const target of targets) {
        const cached = queryClient.getQueryData<PositionOverTimeRow[]>(positionQueryKey(connection, filter, target));
        if (cached === undefined) {
            missing.push(target);
        } else {
            rowsByPosition.set(targetKey(target), cached);
        }
    }

    const chunks = Array.from({ length: Math.ceil(missing.length / POSITIONS_PER_QUERY) }, (_, index) =>
        missing.slice(index * POSITIONS_PER_QUERY, (index + 1) * POSITIONS_PER_QUERY),
    );
    await Promise.all(
        chunks.map(async (chunk) => {
            const { rows } = await connection.query(
                positionsOverTimeQuery(schema, filter, chunk),
                `Over-time positions (${chunk.length})`,
                { signal },
            );
            for (const target of chunk) {
                rowsByPosition.set(targetKey(target), []);
            }
            for (const row of readPositionsOverTime(rows)) {
                rowsByPosition.get(targetKey(row))?.push(row);
            }
            for (const target of chunk) {
                queryClient.setQueryData(
                    positionQueryKey(connection, filter, target),
                    rowsByPosition.get(targetKey(target)),
                );
            }
        }),
    );
    return rowsByPosition;
}

/** The cache key of one position's rows over a (normalized) filter. */
function positionQueryKey(connection: Connection, filter: SiloReadFilter, target: PositionTarget) {
    return ['silo', 'over-time-position', ...connection.key, filter, target.sequenceName, target.position];
}

// --- page: the visible page's cells -----------------------------------------

export type MutationsOverTimePage = {
    /** The full count/coverage/proportion matrix for the visible mutations, or `null` while any position query is still in flight. */
    data: MutationOverTimeDataMap | null;
    /**
     * True until every position on the page has answered.
     *
     * The grid waits for the whole page rather than filling in row by row, because at page size 20
     * and a concurrency cap of 24 the position queries all land within one round-trip, and a
     * half-built matrix renders not-yet-loaded rows as "no coverage", which reads as real data. If a
     * large page (e.g. 250) ever makes the wait noticeable, switch to progressive rendering.
     */
    isLoading: boolean;
    error: unknown;
};

export function useMutationsOverTimePage(
    filter: SiloReadFilter,
    granularity: TemporalGranularity,
    sequenceType: OverTimeSequenceType,
    schemaNucleotideSequence: string,
    requestedDateRanges: TemporalClass[],
    totalCountsByBucket: number[],
    visibleMutationCodes: string[],
    showEmptyDates: boolean,
): MutationsOverTimePage {
    const connection = useConnection();
    const schema = useSiloSchema();
    const normalized = normalizeFilter(filter);

    const targets = useMemo(
        () => positionTargets(visibleMutationCodes, sequenceType, schemaNucleotideSequence),
        [visibleMutationCodes, sequenceType, schemaNucleotideSequence],
    );

    const positionRows = useSiloQueries({
        combine: allQueryData,
        // `schema` stands in for `connection.key` (same memoized SiloInstance); `normalized` for
        // `filter`, so that equivalent filters share a cache entry.
        // eslint-disable-next-line @tanstack/query/exhaustive-deps
        queries: targets.map((target) => ({
            queryKey: positionQueryKey(connection, normalized, target),
            staleTime: Infinity,
            queryFn: async ({ signal }: { signal: AbortSignal }): Promise<PositionOverTimeRow[]> => {
                const { rows } = await connection.query(
                    positionOverTimeQuery(schema, normalized, target),
                    `Over-time position ${target.sequenceName}:${target.position}`,
                    { signal },
                );
                return readPositionOverTime(rows, schema.groupingDate);
            },
        })),
    });

    const { error, data: rows } = positionRows;
    const rowsByPosition = useMemo(
        () => rows && new Map(targets.map((target, index) => [targetKey(target), rows[index]])),
        [targets, rows],
    );

    return useMemo(() => {
        if (error) {
            throw error instanceof Error ? error : new Error(String(error));
        }
        // Wait for the whole page (see `isLoading` above).
        const matrix = rowsByPosition
            ? buildMatrix(
                  visibleMutationCodes,
                  granularity,
                  sequenceType,
                  schemaNucleotideSequence,
                  requestedDateRanges,
                  totalCountsByBucket,
                  rowsByPosition,
              )
            : null;
        return {
            data: matrix === null ? null : removeEmptyDatesUnlessShown(matrix, showEmptyDates),
            isLoading: matrix === null,
            error: undefined,
        };
    }, [
        error,
        rowsByPosition,
        visibleMutationCodes,
        granularity,
        sequenceType,
        schemaNucleotideSequence,
        requestedDateRanges,
        totalCountsByBucket,
        showEmptyDates,
    ]);
}

// --- pure helpers (exported for tests) --------------------------------------

export function toMutationEntries(
    rows: OverallMutationRow[],
    sequenceType: OverTimeSequenceType,
): SubstitutionOrDeletionEntry<Substitution, Deletion>[] {
    return rows.map((row) => {
        const segment = segmentFor(row.sequenceName, sequenceType);
        const proportion = row.coverage === 0 ? 0 : row.count / row.coverage;
        if (row.mutationTo === '-') {
            return {
                type: 'deletion',
                mutation: new DeletionClass(segment, row.mutationFrom, row.position),
                count: row.count,
                proportion,
            };
        }
        return {
            type: 'substitution',
            mutation: new SubstitutionClass(segment, row.mutationFrom, row.mutationTo, row.position),
            count: row.count,
            proportion,
        };
    });
}

/** The nucleotide sequence has one name per organism and its codes are unprefixed; genes keep theirs. */
function segmentFor(sequenceName: string | null, sequenceType: OverTimeSequenceType): string | undefined {
    return sequenceType === 'nucleotide' ? undefined : (sequenceName ?? undefined);
}

/**
 * Every code of `mutationCodes` that parses, with its count and proportion summed over the rows of
 * its position: the reads carrying it over the reads covering the position, as `mutations()` counts
 * them. Without a covering read, both are 0.
 */
export function overallFromPositions(
    mutationCodes: string[],
    sequenceType: OverTimeSequenceType,
    nucleotideSequence: string,
    rowsByPosition: ReadonlyMap<string, PositionOverTimeRow[]>,
): SubstitutionOrDeletionEntry<Substitution, Deletion>[] {
    const unknown = unknownSymbol(sequenceType);
    return mutationCodes.flatMap((code): SubstitutionOrDeletionEntry<Substitution, Deletion>[] => {
        const mutation = parseMutationCode(code);
        if (mutation === null) {
            return [];
        }
        const sequenceName = sequenceType === 'nucleotide' ? nucleotideSequence : mutation.segment;
        const rows = rowsByPosition.get(`${sequenceName ?? ''}:${mutation.position}`) ?? [];
        const alt = mutation.type === 'deletion' ? '-' : (mutation.substitutionValue ?? '');
        let count = 0;
        let coverage = 0;
        for (const row of rows) {
            if (row.sym !== null && row.sym !== unknown && row.sym !== '') {
                coverage += row.count;
                if (row.sym === alt) {
                    count += row.count;
                }
            }
        }
        const proportion = coverage === 0 ? 0 : count / coverage;
        return [
            mutation.type === 'deletion'
                ? { type: 'deletion', mutation, count, proportion }
                : { type: 'substitution', mutation, count, proportion },
        ];
    });
}

/** One position-over-time query per distinct `(sequence, position)` among the codes. */
export function positionTargets(
    mutationCodes: string[],
    sequenceType: OverTimeSequenceType,
    nucleotideSequence: string,
): PositionTarget[] {
    const seen = new Set<string>();
    const targets: PositionTarget[] = [];
    for (const code of mutationCodes) {
        const mutation = parseMutationCode(code);
        if (mutation === null) {
            continue;
        }
        const sequenceName = sequenceType === 'nucleotide' ? nucleotideSequence : mutation.segment;
        if (sequenceName === undefined) {
            continue;
        }
        const target: PositionTarget = { sequenceName, position: mutation.position };
        const key = targetKey(target);
        if (!seen.has(key)) {
            seen.add(key);
            targets.push(target);
        }
    }
    return targets;
}

function targetKey(target: PositionTarget): string {
    return `${target.sequenceName}:${target.position}`;
}

export function buildMatrix(
    visibleMutationCodes: string[],
    granularity: TemporalGranularity,
    sequenceType: OverTimeSequenceType,
    nucleotideSequence: string,
    requestedDateRanges: TemporalClass[],
    totalCountsByBucket: number[],
    rowsByPosition: ReadonlyMap<string, PositionOverTimeRow[]>,
): BaseMutationOverTimeDataMap {
    const unknown = unknownSymbol(sequenceType);
    const mutations = visibleMutationCodes
        .map((code) => parseMutationCode(code))
        .filter((mutation): mutation is SubstitutionClass | DeletionClass => mutation !== null);

    // Per position: per-bucket coverage and per-bucket per-symbol counts, from the rows.
    const perTarget = new Map<string, { coverage: number[]; bySymbol: Map<string, number[]> }>();
    const bucketIndexByKey = new Map(requestedDateRanges.map((bucket, index) => [bucket.dateString, index]));
    const bucketIndexOf = (day: string): number | undefined =>
        bucketIndexByKey.get(parseDateStringToTemporal(day, granularity).dateString);
    for (const [key, rows] of rowsByPosition) {
        const coverage = new Array<number>(requestedDateRanges.length).fill(0);
        const bySymbol = new Map<string, number[]>();
        for (const row of rows) {
            const bucketIndex = bucketIndexOf(row.date);
            if (bucketIndex === undefined) {
                continue;
            }
            const covered = row.sym !== null && row.sym !== unknown && row.sym !== '';
            if (covered) {
                coverage[bucketIndex] += row.count;
                const counts = bySymbol.get(row.sym!) ?? new Array<number>(requestedDateRanges.length).fill(0);
                counts[bucketIndex] += row.count;
                bySymbol.set(row.sym!, counts);
            }
        }
        perTarget.set(key, { coverage, bySymbol });
    }

    const contents: Map2DContents<Substitution | Deletion, Temporal, ProportionValue> = {
        keysFirstAxis: new Map(mutations.map((mutation) => [mutation.code, mutation])),
        keysSecondAxis: new Map(requestedDateRanges.map((bucket) => [bucket.dateString, bucket])),
        data: new Map(
            mutations.map((mutation) => {
                const sequenceName = sequenceType === 'nucleotide' ? nucleotideSequence : mutation.segment;
                const target = perTarget.get(`${sequenceName ?? ''}:${mutation.position}`);
                const alt = mutation.type === 'deletion' ? '-' : (mutation.substitutionValue ?? '');
                return [
                    mutation.code,
                    new Map(
                        requestedDateRanges.map((bucket, bucketIndex): [string, ProportionValue] => {
                            const totalCount = totalCountsByBucket[bucketIndex];
                            if (totalCount === 0) {
                                return [bucket.dateString, null];
                            }
                            const coverage = target?.coverage[bucketIndex] ?? 0;
                            if (coverage === 0) {
                                return [bucket.dateString, { type: 'noCoverage', totalCount }];
                            }
                            const count = target?.bySymbol.get(alt)?.[bucketIndex] ?? 0;
                            return [bucket.dateString, { type: 'value', count, coverage, totalCount }];
                        }),
                    ),
                ];
            }),
        ),
    };

    return new BaseMutationOverTimeDataMap(contents);
}

/** A view with empty date columns removed, or the matrix unchanged when `showEmptyDates` is on. */
export function removeEmptyDatesUnlessShown(
    data: MutationOverTimeDataMap,
    showEmptyDates: boolean,
): MutationOverTimeDataMap {
    if (showEmptyDates) {
        return data;
    }
    const view = new Map2dView(data);
    removeEmptyDatesInPlace(view);
    return view;
}

function parseMutationCode(code: string): SubstitutionClass | DeletionClass | null {
    return DeletionClass.parse(code) ?? SubstitutionClass.parse(code);
}
