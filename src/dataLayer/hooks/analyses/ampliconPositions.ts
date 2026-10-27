/**
 * Resolves an anchor position to its amplicon and the amplicon's positions ranked by variability:
 * one query (`ampliconPositionsQuery`), then three pure steps — reconstruct each position's allele
 * distribution, find the contiguous high-coverage run around the anchor (the amplicon), and rank
 * its positions by Shannon entropy.
 *
 * Verified live against production covid data: amplicon edges are a single-nucleotide-sharp
 * coverage cliff, and most positions are >99% one allele, with a handful genuinely split — the
 * ones worth co-occurrence.
 */

import { useConnection, useRhydbSchema } from '../connection';
import { MAX_COOCCURRENCE_POSITIONS } from './cooccurrence';
import { UserFacingError } from '../../../components/ui/ErrorDisplay';
import { type SequenceType } from '../../../util/mutations';
import {
    ampliconPositionsQuery,
    normalizeFilter,
    readAmpliconPositionRows,
    type AmpliconPositionRow,
    type OverTimeSequenceType,
    type PositionTarget,
    type RhydbReadFilter,
} from '../../queries';
import { useRhydbQuery } from '../rhydbQuery';

/** Below this share of the anchor's own coverage, a position is "outside the amplicon". */
export const AMPLICON_COVERAGE_THRESHOLD_FRACTION = 0.2;

export type PositionEntropy = {
    position: number;
    /** The reference symbol at this position. */
    ref: string;
    coverage: number;
    /** Every observed symbol's read count, including the reference's. */
    distribution: Record<string, number>;
    /** Shannon entropy of `distribution`, in bits — 0 means monomorphic. */
    entropyBits: number;
};

export type AmpliconAnchorResult = {
    /** The detected amplicon, or `null` while loading or if the anchor itself has no coverage. */
    amplicon: { start: number; end: number } | null;
    /** Every position in the amplicon, sorted by entropy descending. */
    positionsByEntropy: PositionEntropy[];
    isLoading: boolean;
    error: Error | null;
};

export function useAmpliconAnchor(
    filter: RhydbReadFilter,
    sequenceType: OverTimeSequenceType,
    anchor: PositionTarget | null,
): AmpliconAnchorResult {
    const connection = useConnection();
    const schema = useRhydbSchema();
    const normalized = normalizeFilter(filter);

    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    const query = useRhydbQuery({
        queryKey: ['rhydb', 'amplicon-anchor', ...connection.key, normalized, sequenceType, anchor],
        enabled: anchor !== null,
        queryFn: async ({ signal }) => {
            if (anchor === null) {
                throw new Error('useAmpliconAnchor queryFn called with no anchor');
            }
            const { rows } = await connection.query(
                ampliconPositionsQuery(schema, normalized, anchor, sequenceType),
                'Amplicon positions',
                { signal },
            );
            const positionRows = readAmpliconPositionRows(rows);

            const byPosition = groupByPosition(positionRows);
            const anchorCoverage = byPosition.get(anchor.position)?.coverage;
            if (anchorCoverage === undefined || anchorCoverage === 0) {
                throw new UserFacingError(
                    'No coverage at this position',
                    `Position ${anchor.position} has no covering reads in the current filter. Try a different position, ` +
                        'or widen the location / sampling-date filter.',
                );
            }

            const amplicon = detectAmpliconRange(byPosition, anchor.position, anchorCoverage);
            const positionsByEntropy =
                amplicon === null ? [] : entropyInRange(byPosition, amplicon.start, amplicon.end);

            return { amplicon, positionsByEntropy };
        },
    });

    return {
        amplicon: query.data?.amplicon ?? null,
        positionsByEntropy: query.data?.positionsByEntropy ?? [],
        isLoading: query.isPending,
        error: query.error,
    };
}

// --- pure helpers (exported for tests) --------------------------------------

type PositionInfo = { coverage: number; ref: string; alts: Map<string, number> };

export function groupByPosition(rows: readonly AmpliconPositionRow[]): Map<number, PositionInfo> {
    const byPosition = new Map<number, PositionInfo>();
    for (const row of rows) {
        const info = byPosition.get(row.position) ?? { coverage: row.coverage, ref: row.mutationFrom, alts: new Map() };
        info.coverage = Math.max(info.coverage, row.coverage);
        info.alts.set(row.mutationTo, row.count);
        byPosition.set(row.position, info);
    }
    return byPosition;
}

/**
 * The maximal contiguous run of positions around `anchorPosition` whose
 * coverage is within the same order of magnitude as the anchor's own — the
 * amplicon, as opposed to the sparse chimeric/off-target reads scattered
 * elsewhere in the genome that this same query also picks up.
 */
export function detectAmpliconRange(
    byPosition: ReadonlyMap<number, PositionInfo>,
    anchorPosition: number,
    anchorCoverage: number,
    thresholdFraction: number = AMPLICON_COVERAGE_THRESHOLD_FRACTION,
): { start: number; end: number } | null {
    const threshold = anchorCoverage * thresholdFraction;
    const covered = [...byPosition.entries()]
        .filter(([, info]) => info.coverage >= threshold)
        .map(([position]) => position)
        .sort((a, b) => a - b);

    const anchorIndex = covered.indexOf(anchorPosition);
    if (anchorIndex === -1) {
        return null;
    }

    let start = anchorIndex;
    let end = anchorIndex;
    while (start > 0 && covered[start - 1] === covered[start] - 1) {
        start -= 1;
    }
    while (end < covered.length - 1 && covered[end + 1] === covered[end] + 1) {
        end += 1;
    }
    return { start: covered[start], end: covered[end] };
}

/** Every position in `[start, end]` with data, with its full allele distribution and entropy. */
export function entropyInRange(
    byPosition: ReadonlyMap<number, PositionInfo>,
    start: number,
    end: number,
): PositionEntropy[] {
    const results: PositionEntropy[] = [];
    for (let position = start; position <= end; position++) {
        const info = byPosition.get(position);
        if (info === undefined) {
            continue;
        }
        const distribution: Record<string, number> = Object.fromEntries(info.alts);
        const altTotal = [...info.alts.values()].reduce((sum, count) => sum + count, 0);
        const refCount = info.coverage - altTotal;
        if (refCount > 0) {
            distribution[info.ref] = (distribution[info.ref] ?? 0) + refCount;
        }
        results.push({
            position,
            ref: info.ref,
            coverage: info.coverage,
            distribution,
            entropyBits: shannonEntropyBits(distribution, info.coverage),
        });
    }
    return results.sort((a, b) => b.entropyBits - a.entropyBits);
}

function shannonEntropyBits(distribution: Record<string, number>, coverage: number): number {
    if (coverage <= 0) {
        return 0;
    }
    let entropy = 0;
    for (const count of Object.values(distribution)) {
        if (count <= 0) {
            continue;
        }
        const p = count / coverage;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}

/**
 * The positions to run co-occurrence over: every position above the entropy
 * cutoff, most variable first, capped at `MAX_COOCCURRENCE_POSITIONS`.
 */
export function selectDiversePositions(
    positionsByEntropy: readonly PositionEntropy[],
    entropyCutoffBits: number,
): number[] {
    // Ranked by entropy to pick *which* positions, then re-sorted by genomic position
    // (order of appearance) for display — reading the table's columns left-to-right only
    // makes sense in that order.
    return positionsByEntropy
        .filter((p) => p.entropyBits > entropyCutoffBits)
        .slice(0, MAX_COOCCURRENCE_POSITIONS)
        .map((p) => p.position)
        .sort((a, b) => a - b);
}

/** The label a position gets in the co-occurrence output, matching `parsePositionToken`'s canonical form. */
export function labelFor(position: number, sequenceType: SequenceType, segment: string | undefined): string {
    return sequenceType === 'amino acid' && segment !== undefined ? `${segment}:${position}` : `${position}`;
}
