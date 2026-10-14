/**
 * `Cooccurrence` over SILO, in one hook.
 *
 * Unlike `mutationsOverTime.ts` (a metadata query plus one position-over-time
 * query per visible mutation), co-occurrence needs the *joint* distribution
 * across every selected position, which is exactly what `positionsCooccurrenceQuery`
 * answers in a single call — so there is one query here, not a metadata/page
 * split. Positions are given by the caller (typed in the co-occurrence filter),
 * not discovered from the data, so there's nothing to page a query over either;
 * pagination of the *rows this produces* (patterns) happens client-side in the
 * component, over the already-fetched result.
 */

import { useQuery } from '@tanstack/react-query';

import { useConnection, useSiloSchema } from './connection';
import { MAX_GRID_COLUMNS, buildDateAxis, withDateBounds } from './mutationsOverTime';
import {
    CooccurrenceOverTimeDataMap,
    type CooccurrencePattern,
} from '../../components/dataDisplay/cooccurrence/CooccurrenceOverTimeData';
import { type ProportionValue, removeEmptyDatesInPlace } from '../../components/dataDisplay/overTime/proportionValue';
import { UserFacingError } from '../../components/shared/error-display';
import { type TemporalGranularity } from '../../types/dashboardComponents';
import { Map2dView } from '../../util/map2d';
import { parseDateStringToTemporal, type Temporal, type TemporalClass } from '../../util/temporalClass';
import {
    normalizeFilter,
    positionsCooccurrenceQuery,
    readCooccurrenceRows,
    samplingDatesQuery,
    type CooccurrenceRow,
    type OverTimeSequenceType,
    type PositionTarget,
    type SiloReadFilter,
} from '../queries';
import { readNamedCounts } from '../queries/rows';

/** Above this many positions the joint distribution is unwieldy and unverified; refuse it. */
export const MAX_COOCCURRENCE_POSITIONS = 10;

export type CooccurrenceResult = {
    /** The full pattern/date matrix, or `null` while the query is in flight. */
    data: CooccurrenceOverTimeDataMap | null;
    /** Every bucket in range, gap-filled and sorted. */
    requestedDateRanges: TemporalClass[];
    isLoading: boolean;
    error: Error | null;
};

export function useCooccurrence(
    filter: SiloReadFilter,
    granularity: TemporalGranularity,
    sequenceType: OverTimeSequenceType,
    targets: readonly PositionTarget[],
    positionLabels: readonly string[],
): CooccurrenceResult {
    const connection = useConnection();
    const schema = useSiloSchema();
    const normalized = normalizeFilter(filter);

    // `schema` stands in for `connection.key` (same memoized SiloInstance);
    // `normalized` stands in for `filter` — a pure, order-independent derivation
    // of it, used instead so equivalent filters share a cache entry.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    const query = useQuery({
        queryKey: ['silo', 'cooccurrence', ...connection.key, normalized, granularity, sequenceType, targets],
        queryFn: async ({
            signal,
        }): Promise<{ data: CooccurrenceOverTimeDataMap; requestedDateRanges: TemporalClass[] }> => {
            if (targets.length === 0) {
                return { data: new CooccurrenceOverTimeDataMap(), requestedDateRanges: [] };
            }
            if (targets.length > MAX_COOCCURRENCE_POSITIONS) {
                throw new UserFacingError(
                    'Too many positions',
                    `The number of positions is ${targets.length}, which exceeds the maximum of ` +
                        `${MAX_COOCCURRENCE_POSITIONS}. Please reduce the number of positions to ` +
                        `${MAX_COOCCURRENCE_POSITIONS} or fewer.`,
                );
            }

            const dateRows = await connection
                .query(samplingDatesQuery(schema, normalized), 'Co-occurrence date axis', { signal })
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

            if (requestedDateRanges.length === 0) {
                return { data: new CooccurrenceOverTimeDataMap(), requestedDateRanges };
            }

            const boundedFilter = withDateBounds(normalized, requestedDateRanges);
            const { rows } = await connection.query(
                positionsCooccurrenceQuery(schema, boundedFilter, targets),
                'Co-occurrence',
                { signal },
            );
            const cooccurrenceRows = readCooccurrenceRows(rows, schema.groupingDate, targets);

            const data = buildCooccurrenceMap(
                cooccurrenceRows,
                requestedDateRanges,
                totalCountsByBucket,
                granularity,
                positionLabels,
                unknownSymbol(sequenceType),
            );
            return { data, requestedDateRanges };
        },
    });

    return {
        data: query.data?.data ?? null,
        requestedDateRanges: query.data?.requestedDateRanges ?? [],
        isLoading: query.isPending,
        error: query.error,
    };
}

/**
 * A view of `data` with patterns whose mean proportion falls outside
 * `proportionInterval` removed, and (if `hideGaps`) empty date columns dropped too.
 */
export function filterCooccurrenceByMeanProportion(
    data: CooccurrenceOverTimeDataMap,
    proportionInterval: { min: number; max: number },
    hideGaps: boolean,
): Map2dView<CooccurrencePattern, Temporal, ProportionValue> {
    const view = new Map2dView(data);
    const dates = view.getSecondAxisKeys();

    const patternsToRemove = view.getFirstAxisKeys().filter((pattern) => {
        let totalCount = 0;
        let totalCoverage = 0;
        for (const date of dates) {
            const value = view.get(pattern, date);
            if (value?.type === 'value') {
                totalCount += value.count;
                totalCoverage += value.coverage;
            }
        }
        const meanProportion = totalCoverage > 0 ? totalCount / totalCoverage : 0;
        return meanProportion < proportionInterval.min || meanProportion > proportionInterval.max;
    });

    for (const pattern of patternsToRemove) {
        view.deleteRow(pattern);
    }
    if (hideGaps) {
        removeEmptyDatesInPlace(view);
    }
    return view;
}

/** A view of `data` keeping only the given patterns' rows — how the component slices a page. */
export function sliceCooccurrenceRows(
    data: Map2dView<CooccurrencePattern, Temporal, ProportionValue>,
    patternsToKeep: readonly CooccurrencePattern[],
): Map2dView<CooccurrencePattern, Temporal, ProportionValue> {
    const keepKeys = new Set(patternsToKeep.map((pattern) => data.serializeFirstAxis(pattern)));
    const sliced = new Map2dView(data);
    for (const pattern of data.getFirstAxisKeys()) {
        if (!keepKeys.has(data.serializeFirstAxis(pattern))) {
            sliced.deleteRow(pattern);
        }
    }
    return sliced;
}

/** The symbol that means "the read did not call anything at this position". */
function unknownSymbol(sequenceType: OverTimeSequenceType): string {
    return sequenceType === 'nucleotide' ? 'N' : 'X';
}

// --- pure helpers (exported for tests) --------------------------------------

type CountedGroup = { symbols: Record<string, string | null>; count: number };

/**
 * The pattern/date matrix from the raw joint rows.
 *
 * Ported from dashboard-components' `queryMutationCooccurrence` (which built
 * this from a flat LAPIS `aggregated` response grouped the same way, one row
 * per date + symbol combination): only patterns covered at at least one
 * position are kept, sorted by how many positions they cover (most first),
 * then alphabetically. A pattern's "coverage" at a bucket is every read that
 * is at least as informative as this pattern's own covered positions —
 * matching how a single mutation's coverage in `mutationsOverTime.ts` counts
 * every read with a known symbol there, regardless of what else the read
 * carries.
 */
export function buildCooccurrenceMap(
    rows: readonly CooccurrenceRow[],
    requestedDateRanges: readonly TemporalClass[],
    totalCountsByBucket: readonly number[],
    granularity: TemporalGranularity,
    positionLabels: readonly string[],
    unknown: string,
): CooccurrenceOverTimeDataMap {
    const bucketIndexByKey = new Map(requestedDateRanges.map((bucket, index) => [bucket.dateString, index]));

    const patternByKey = new Map<string, CooccurrencePattern>();
    const countsByPatternAndBucket = new Map<string, number[]>();
    const groupsByBucket: CountedGroup[][] = requestedDateRanges.map(() => []);

    for (const row of rows) {
        const bucketIndex = bucketIndexByKey.get(parseDateStringToTemporal(row.date, granularity).dateString);
        if (bucketIndex === undefined) {
            continue;
        }

        const symbols = extractSymbols(row, positionLabels, unknown);
        const pattern: CooccurrencePattern = { symbols };
        const key = patternKey(symbols, positionLabels);
        patternByKey.set(key, pattern);

        groupsByBucket[bucketIndex].push({ symbols, count: row.count });

        const counts = countsByPatternAndBucket.get(key) ?? new Array<number>(requestedDateRanges.length).fill(0);
        counts[bucketIndex] += row.count;
        countsByPatternAndBucket.set(key, counts);
    }

    const coveredPatterns = [...patternByKey.values()].filter((pattern) => isCovered(pattern));
    const sortedPatterns = sortPatternsByCoverageAndCount(coveredPatterns, positionLabels);

    const resultMap = new CooccurrenceOverTimeDataMap();
    for (const pattern of sortedPatterns) {
        const counts = countsByPatternAndBucket.get(patternKey(pattern.symbols, positionLabels))!;
        const coveredPositions = positionLabels.filter((label) => pattern.symbols[label] !== null);

        requestedDateRanges.forEach((bucket, bucketIndex) => {
            const total = totalCountsByBucket[bucketIndex];
            if (total === 0) {
                resultMap.set(pattern, bucket, null);
                return;
            }
            const coverage = computeCoverage(groupsByBucket[bucketIndex], coveredPositions);
            if (coverage === 0) {
                resultMap.set(pattern, bucket, null);
            } else {
                resultMap.set(pattern, bucket, {
                    type: 'value',
                    count: counts[bucketIndex],
                    coverage,
                    totalCount: total,
                });
            }
        });
    }

    return resultMap;
}

function extractSymbols(
    row: CooccurrenceRow,
    positionLabels: readonly string[],
    unknown: string,
): Record<string, string | null> {
    const symbols: Record<string, string | null> = {};
    positionLabels.forEach((label, index) => {
        const symbol = row.symbols[index] ?? null;
        symbols[label] = symbol !== null && symbol !== unknown ? symbol : null;
    });
    return symbols;
}

function patternKey(symbols: Record<string, string | null>, positionLabels: readonly string[]): string {
    return positionLabels.map((label) => `${label}:${symbols[label] ?? ''}`).join('|');
}

/** A pattern is only displayed if at least one of its queried positions is covered. */
function isCovered(pattern: CooccurrencePattern): boolean {
    return Object.values(pattern.symbols).some((symbol) => symbol !== null);
}

/** Sorts patterns by number of covered positions descending, then alphabetically by pattern key. */
function sortPatternsByCoverageAndCount(
    patterns: readonly CooccurrencePattern[],
    positionLabels: readonly string[],
): CooccurrencePattern[] {
    const coverageCount = (pattern: CooccurrencePattern) =>
        positionLabels.filter((label) => pattern.symbols[label] !== null).length;

    return [...patterns].sort((a, b) => {
        const countA = coverageCount(a);
        const countB = coverageCount(b);
        if (countA !== countB) {
            return countB - countA;
        }
        return patternKey(a.symbols, positionLabels).localeCompare(patternKey(b.symbols, positionLabels));
    });
}

/** Sums the counts of groups that are covered at every one of the given positions. */
function computeCoverage(groups: readonly CountedGroup[], coveredPositions: readonly string[]): number {
    return groups
        .filter((group) => coveredPositions.every((position) => group.symbols[position] !== null))
        .reduce((sum, group) => sum + group.count, 0);
}

/**
 * The `PositionTarget`s (and their display labels) for a co-occurrence query, from
 * the validated position tokens in the analysis filter. Deduplicates by
 * `(sequenceName, position)`, same as `positionTargets` in `mutationsOverTime.ts`.
 */
export function cooccurrenceTargets(
    positions: readonly { label: string; segment: string | undefined; position: number }[],
    sequenceType: OverTimeSequenceType,
    nucleotideSequence: string,
): { targets: PositionTarget[]; labels: string[] } {
    const targets: PositionTarget[] = [];
    const labels: string[] = [];
    const seen = new Set<string>();

    for (const token of positions) {
        const sequenceName = sequenceType === 'nucleotide' ? nucleotideSequence : (token.segment ?? '');
        if (sequenceName === '') {
            continue;
        }
        const key = `${sequenceName}:${token.position}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        targets.push({ sequenceName, position: token.position });
        labels.push(token.label);
    }

    return { targets, labels };
}
