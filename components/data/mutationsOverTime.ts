/**
 * `gs-mutations-over-time` over SILO, in two phases.
 *
 * Phase 1 (`useOverTimeMetadata`): the date axis + per-bucket read totals, and
 * the sorted mutation list with each row's overall proportion. Two cheap
 * queries, independent of the page.
 *
 * Phase 2 (`usePositionPileups`): one symbol-pileup query per distinct position
 * of the *visible page's* mutations — `groupBy(count(), {date, seq.at(pos)})`,
 * location-scoped, the whole date range. Cached per position (`staleTime:
 * Infinity`), so paging, filter changes and revisits reuse whatever positions
 * are already in hand. The count/coverage matrix is a pure function of the
 * pileups (`buildMatrix`).
 */

import { useMemo } from 'react';
import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useConnection, useSiloSchema } from './connection';
import {
    mutationSpectrumQuery,
    normalizeFilter,
    positionPileupQuery,
    readMutationSpectrum,
    readPositionPileup,
    samplingDatesQuery,
    type MutationSpectrumRow,
    type OverTimeSequenceType,
    type PileupTarget,
    type PositionPileupRow,
    type SiloReadFilter,
} from '../queries';
import { readNamedCounts } from '../queries/rows';
import { UserFacingError } from '../react/components/error-display';
import {
    BaseMutationOverTimeDataMap,
    type MutationOverTimeDataMap,
} from '../react/mutationsOverTime/MutationOverTimeData';
import { sortSubstitutionsAndDeletions } from '../react/shared/sort/sortSubstitutionsAndDeletions';
import { hideGapsInPlace, type ProportionValue } from '../query/queryMutationsOverTime';
import { type SubstitutionOrDeletionEntry, type TemporalGranularity } from '../types';
import { Map2dView, type Map2DContents } from '../utils/map2d';
import { DeletionClass, SubstitutionClass, type Deletion, type Substitution } from '../utils/mutations';
import {
    generateAllInRange,
    getMinMaxTemporal,
    parseDateStringToTemporal,
    type Temporal,
    type TemporalClass,
} from '../utils/temporalClass';

/** Above this many date buckets the grid is unreadable and the queries are expensive; refuse it. */
const MAX_GRID_COLUMNS = 200;

/** The symbol that means "the read did not call anything here". */
function unknownSymbol(sequenceType: OverTimeSequenceType): string {
    return sequenceType === 'nucleotide' ? 'N' : 'X';
}

// --- phase 1 -------------------------------------------------------------------

export type OverTimeMetadata = {
    /** Every bucket in range, gap-filled and sorted. */
    requestedDateRanges: TemporalClass[];
    /** Total reads per bucket, index-aligned with `requestedDateRanges`. */
    totalCountsByBucket: number[];
    /** Mutations above the proportion floor, sorted, filtered to `displayMutations` if given. */
    overallMutations: SubstitutionOrDeletionEntry<Substitution, Deletion>[];
};

export function useOverTimeMetadata(
    filter: SiloReadFilter,
    granularity: TemporalGranularity,
    sequenceType: OverTimeSequenceType,
    sequenceNames: readonly string[] | undefined,
    displayMutations: string[] | undefined,
): UseQueryResult<OverTimeMetadata> {
    const connection = useConnection();
    const schema = useSiloSchema();
    const normalized = normalizeFilter(filter);
    const sequenceNamesKey = sequenceNames === undefined ? undefined : [...sequenceNames].sort();

    return useQuery({
        queryKey: [
            'silo',
            'over-time-metadata',
            ...connection.key,
            normalized,
            granularity,
            sequenceType,
            sequenceNamesKey,
            displayMutations,
        ],
        queryFn: async ({ signal }): Promise<OverTimeMetadata> => {
            // Date axis first: the "too many buckets" guard has to fire before the
            // (potentially expensive) mutation-spectrum scan.
            const dateRows = await connection
                .query(samplingDatesQuery(schema, normalized), 'Over-time date axis', { signal })
                .then((result) => readNamedCounts(result.rows, schema.groupingDate));

            const { requestedDateRanges, totalCountsByBucket } = buildDateAxis(dateRows, granularity, filter);

            if (requestedDateRanges.length > MAX_GRID_COLUMNS) {
                throw new UserFacingError(
                    'Too many dates',
                    `The dataset would contain ${requestedDateRanges.length} date intervals. ` +
                        `Please reduce the number to below ${MAX_GRID_COLUMNS} — narrow the sampling-date filter, ` +
                        'or choose a coarser granularity.',
                );
            }

            const boundedFilter = withDateBounds(normalized, requestedDateRanges);
            const spectrumRows = await connection
                .query(
                    mutationSpectrumQuery(schema, boundedFilter, { sequenceType, sequenceNames }),
                    'Over-time mutations',
                    { signal },
                )
                .then((result) => readMutationSpectrum(result.rows));

            const overallMutations = toMutationEntries(spectrumRows, sequenceType)
                .filter((entry) => displayMutations === undefined || displayMutations.includes(entry.mutation.code))
                .sort((a, b) => sortSubstitutionsAndDeletions(a.mutation, b.mutation));

            return { requestedDateRanges, totalCountsByBucket, overallMutations };
        },
    });
}

// --- phase 2 -------------------------------------------------------------------

export type MutationsOverTimePage = {
    /** The count/coverage/proportion matrix for the visible mutations, or `null` while the first pileup lands. */
    data: MutationOverTimeDataMap | null;
    /** True until at least one position's pileup has arrived. */
    isLoading: boolean;
    error: unknown;
    /** Positions answered so far / total, for a progress hint. */
    progress: { counted: number; total: number };
};

export function useMutationsOverTimePage(
    filter: SiloReadFilter,
    granularity: TemporalGranularity,
    sequenceType: OverTimeSequenceType,
    schemaNucleotideSequence: string,
    requestedDateRanges: TemporalClass[],
    totalCountsByBucket: number[],
    visibleMutationCodes: string[],
    hideGaps: boolean,
): MutationsOverTimePage {
    const connection = useConnection();
    const schema = useSiloSchema();
    const location = normalizeFilter(filter).locationName;

    const targets = useMemo(
        () => pileupTargets(visibleMutationCodes, sequenceType, schemaNucleotideSequence),
        [visibleMutationCodes, sequenceType, schemaNucleotideSequence],
    );

    const results = useQueries({
        queries: targets.map((target) => ({
            queryKey: [
                'silo',
                'over-time-pileup',
                ...connection.key,
                location ?? null,
                target.sequenceName,
                target.position,
            ],
            staleTime: Infinity,
            queryFn: async ({ signal }: { signal: AbortSignal }): Promise<PositionPileupRow[]> => {
                const { rows } = await connection.query(
                    positionPileupQuery(schema, { locationName: location }, target),
                    `Over-time position ${target.sequenceName}:${target.position}`,
                    { signal },
                );
                return readPositionPileup(rows, schema.groupingDate);
            },
        })),
    });

    const error = results.find((result) => result.error)?.error;
    const counted = results.filter((result) => result.data !== undefined).length;

    const pileupByTarget = useMemo(() => {
        const map = new Map<string, PositionPileupRow[]>();
        targets.forEach((target, index) => {
            const rows = results[index]?.data;
            if (rows !== undefined) {
                map.set(targetKey(target), rows);
            }
        });
        return map;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targets, results.map((result) => (result.data === undefined ? 0 : 1)).join('')]);

    return useMemo(() => {
        if (error) {
            throw error instanceof Error ? error : new Error(String(error));
        }
        const anyAnswered = pileupByTarget.size > 0;
        const matrix = anyAnswered
            ? buildMatrix(
                  visibleMutationCodes,
                  granularity,
                  sequenceType,
                  schemaNucleotideSequence,
                  requestedDateRanges,
                  totalCountsByBucket,
                  pileupByTarget,
              )
            : null;
        return {
            data: matrix === null ? null : applyHideGaps(matrix, hideGaps),
            isLoading: !anyAnswered,
            error: undefined,
            progress: { counted, total: targets.length },
        };
    }, [
        error,
        pileupByTarget,
        visibleMutationCodes,
        granularity,
        sequenceType,
        schemaNucleotideSequence,
        requestedDateRanges,
        totalCountsByBucket,
        hideGaps,
        counted,
        targets.length,
    ]);
}

// --- pure helpers (exported for tests) --------------------------------------

export function buildDateAxis(
    dateRows: { name: string; count: number }[],
    granularity: TemporalGranularity,
    filter: SiloReadFilter,
): { requestedDateRanges: TemporalClass[]; totalCountsByBucket: number[] } {
    const countByBucket = new Map<string, number>();
    const bucketByKey = new Map<string, TemporalClass>();
    for (const { name, count } of dateRows) {
        const bucket = parseDateStringToTemporal(name, granularity);
        countByBucket.set(bucket.dateString, (countByBucket.get(bucket.dateString) ?? 0) + count);
        bucketByKey.set(bucket.dateString, bucket);
    }

    const { min, max } = getMinMaxTemporal(bucketByKey.values());
    const from = filter.samplingDateFrom ? parseDateStringToTemporal(filter.samplingDateFrom, granularity) : min;
    const to = filter.samplingDateTo ? parseDateStringToTemporal(filter.samplingDateTo, granularity) : max;

    const requestedDateRanges = generateAllInRange(from, to);
    const totalCountsByBucket = requestedDateRanges.map((bucket) => countByBucket.get(bucket.dateString) ?? 0);
    return { requestedDateRanges, totalCountsByBucket };
}

export function toMutationEntries(
    rows: MutationSpectrumRow[],
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
 * The genes to restrict the phase-1 `mutations()` scan to, given a fixed display
 * set — `['S']` for Spike codes, `undefined` (all sequences) for nucleotides or
 * an open set. A big speed-up on the spectrum scan.
 */
export function genesOf(
    displayMutations: string[] | undefined,
    sequenceType: OverTimeSequenceType,
): readonly string[] | undefined {
    if (sequenceType !== 'amino acid' || displayMutations === undefined) {
        return undefined;
    }
    const genes = new Set<string>();
    for (const code of displayMutations) {
        const colon = code.indexOf(':');
        if (colon > 0) {
            genes.add(code.slice(0, colon));
        }
    }
    return genes.size === 0 ? undefined : [...genes];
}

/** One pileup query per distinct `(sequence, position)` among the codes. */
export function pileupTargets(
    mutationCodes: string[],
    sequenceType: OverTimeSequenceType,
    nucleotideSequence: string,
): PileupTarget[] {
    const seen = new Set<string>();
    const targets: PileupTarget[] = [];
    for (const code of mutationCodes) {
        const mutation = parseMutationCode(code);
        if (mutation === null) {
            continue;
        }
        const sequenceName = sequenceType === 'nucleotide' ? nucleotideSequence : mutation.segment;
        if (sequenceName === undefined) {
            continue;
        }
        const target: PileupTarget = { sequenceName, position: mutation.position };
        const key = targetKey(target);
        if (!seen.has(key)) {
            seen.add(key);
            targets.push(target);
        }
    }
    return targets;
}

function targetKey(target: PileupTarget): string {
    return `${target.sequenceName}:${target.position}`;
}

export function buildMatrix(
    visibleMutationCodes: string[],
    granularity: TemporalGranularity,
    sequenceType: OverTimeSequenceType,
    nucleotideSequence: string,
    requestedDateRanges: TemporalClass[],
    totalCountsByBucket: number[],
    pileupByTarget: ReadonlyMap<string, PositionPileupRow[]>,
): BaseMutationOverTimeDataMap {
    const unknown = unknownSymbol(sequenceType);
    const mutations = visibleMutationCodes
        .map((code) => parseMutationCode(code))
        .filter((mutation): mutation is SubstitutionClass | DeletionClass => mutation !== null);

    // Per target: per-bucket coverage and per-bucket per-symbol counts, from the pileup rows.
    const perTarget = new Map<string, { coverage: number[]; bySymbol: Map<string, number[]> }>();
    const bucketIndexByKey = new Map(requestedDateRanges.map((bucket, index) => [bucket.dateString, index]));
    const bucketIndexOf = (day: string): number | undefined =>
        bucketIndexByKey.get(parseDateStringToTemporal(day, granularity).dateString);
    for (const [key, rows] of pileupByTarget) {
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
                                return [bucket.dateString, { type: 'belowThreshold', totalCount }];
                            }
                            const count = target?.bySymbol.get(alt)?.[bucketIndex] ?? 0;
                            return [bucket.dateString, { type: 'valueWithCoverage', count, coverage, totalCount }];
                        }),
                    ),
                ];
            }),
        ),
    };

    return new BaseMutationOverTimeDataMap(contents);
}

/** A view with empty date columns removed, or the matrix unchanged when `hideGaps` is off. */
export function applyHideGaps(data: MutationOverTimeDataMap, hideGaps: boolean): MutationOverTimeDataMap {
    if (!hideGaps) {
        return data;
    }
    const view = new Map2dView(data);
    hideGapsInPlace(view);
    return view;
}

/** The filter with its sampling-date window narrowed to the span the buckets cover. */
function withDateBounds(filter: SiloReadFilter, requestedDateRanges: TemporalClass[]): SiloReadFilter {
    if (requestedDateRanges.length === 0) {
        return filter;
    }
    return {
        ...filter,
        samplingDateFrom: requestedDateRanges[0].firstDay.toString(),
        samplingDateTo: requestedDateRanges[requestedDateRanges.length - 1].lastDay.toString(),
    };
}

function parseMutationCode(code: string): SubstitutionClass | DeletionClass | null {
    return DeletionClass.parse(code) ?? SubstitutionClass.parse(code);
}
