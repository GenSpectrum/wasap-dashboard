import { type Amplicon } from './primerBed';

/**
 * How many positions of an amplicon's insert are sampled to measure its coverage: one, the middle of
 * its core, so the coverage page costs one query per amplicon.
 *
 * Checked against the median of three evenly spread positions over all of Zürich's and Genève's data
 * (61 dates × 96 amplicons each): the middle position alone is within ±10% of it for 99.7% of the
 * cells with at least 100 reads, and never off by more than 50%. The _start_ of the core would not
 * do: some amplicons (39 most of all, also 19 and 67) have reads that barely cover the first ~100
 * positions of their insert, which would show up as dropouts.
 */
export const SAMPLING_POSITIONS_PER_AMPLICON = 1;

/**
 * The positions at which to measure how many reads an amplicon has, without knowing which amplicon
 * each read came from (SILO has no read start/end or amplicon column).
 *
 * In a tiled scheme, the neighbouring amplicons overlap: the start of an insert is also the end of
 * the previous amplicon's insert, and its end the start of the next one's. A read covering a
 * position there could come from either. So the positions are picked from the insert's _core_, the
 * longest stretch of it that no other amplicon's insert covers, where every covering read is one of
 * this amplicon's. With more than one position, the caller takes the median over them, which keeps
 * a single position with an odd coverage from standing in for the whole amplicon.
 *
 * Positions are 1-based, like the amplicon coordinates. Evenly spread across the core (so a single
 * one is its middle); fewer than `count` if the core is shorter than that.
 */
export function samplingPositions(
    amplicon: Amplicon,
    allAmplicons: readonly Amplicon[],
    count: number = SAMPLING_POSITIONS_PER_AMPLICON,
): number[] {
    const { start, end } = insertCore(amplicon, allAmplicons);
    const length = end - start + 1;
    if (length <= count) {
        return Array.from({ length }, (_, index) => start + index);
    }
    const positions = Array.from({ length: count }, (_, index) =>
        Math.round(start - 1 + ((index + 1) * length) / (count + 1)),
    );
    return [...new Set(positions)];
}

/**
 * The longest stretch of an amplicon's insert that no other amplicon's insert overlaps. The whole
 * insert, if every position of it is shared (which a sensible scheme never does).
 */
export function insertCore(amplicon: Amplicon, allAmplicons: readonly Amplicon[]): { start: number; end: number } {
    const others = allAmplicons
        .filter((other) => other !== amplicon && other.chrom === amplicon.chrom)
        .filter((other) => other.insertStart <= amplicon.insertEnd && other.insertEnd >= amplicon.insertStart)
        .sort((a, b) => a.insertStart - b.insertStart);

    let best: { start: number; end: number } | undefined;
    let cursor = amplicon.insertStart;
    for (const other of [...others, { insertStart: amplicon.insertEnd + 1, insertEnd: amplicon.insertEnd + 1 }]) {
        const gapEnd = Math.min(other.insertStart - 1, amplicon.insertEnd);
        if (gapEnd >= cursor && (best === undefined || gapEnd - cursor > best.end - best.start)) {
            best = { start: cursor, end: gapEnd };
        }
        cursor = Math.max(cursor, other.insertEnd + 1);
    }
    return best ?? { start: amplicon.insertStart, end: amplicon.insertEnd };
}
