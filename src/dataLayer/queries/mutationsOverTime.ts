/**
 * The RhyDB queries behind `gs-mutations-over-time`.
 *
 * There is no over-time / coverage primitive in SaneQL, and the batching
 * options don't hold (grouping by a `unionall` tag literal, or by the `DATE32`
 * column alongside a mapped `at()`, both time out — see
 * standalone-wasap/10-silo-over-time-findings.md). So the matrix is assembled
 * from **one symbol distribution per position, per day**, and the two queries
 * here back the two data hooks in `dataLayer/hooks/analyses/mutationsOverTime.ts`:
 *
 *   `overallMutationsQuery` — one `mutations()` call for the *metadata*: which
 *     mutations get a grid row, and each one's proportion over the whole shown
 *     span (drives the "minimum proportion" filter across pages). Only where the
 *     mutations aren't known in advance.
 *   `positionOverTimeQuery` — one `map(sym := seq.at(pos)).group(count(), {date, sym})`
 *     per distinct position of the visible *page*: the full symbol distribution
 *     there, per day. `coverage = Σ count(known symbols)`,
 *     `count = Σ count(alt)`. Over the filter's dates, bucketed client-side.
 *   `positionsOverTimeQuery` — the same for many positions in one `unionall`.
 *     Where the mutations are known in advance, it answers both: the metadata
 *     is their sums over the days.
 */

import { dateRangeExpression, scoped, type RhydbReadFilter } from './filter';
import { groupingColumnsPassThrough } from './groupingColumns';
import { type ReferenceSequence } from './referenceGenome';
import type { RhydbSchema } from './schema';
import { field, int, str } from '../transport/expression';
import { count } from '../transport/functions';
import { unionall, type Relation } from '../transport/relation';
import { readCount, readOptionalText, readText, type RhydbRow } from '../transport/row';

export type OverTimeSequenceType = 'nucleotide' | 'amino acid';

/** Below this overall proportion a mutation is not offered as a row (matches the old LAPIS path). */
export const OVER_TIME_MIN_PROPORTION = 0.001;

// --- metadata: which mutations get a row ----------------------------------

const OVERALL_MUTATION_FIELDS = [
    'mutationFrom',
    'mutationTo',
    'sequenceName',
    'position',
    'count',
    'coverage',
] as const;

export type OverallMutationsOptions = {
    sequenceType: OverTimeSequenceType;
    /** Defaults to `OVER_TIME_MIN_PROPORTION`. */
    minProportion?: number;
};

/**
 * Every mutation the filtered reads carry above the proportion floor, as
 * `{ mutationFrom, mutationTo, sequenceName, position, count, coverage }` — one
 * `mutations()` call, scoped to the shown date span. This is the whole-range
 * ("overall") figure per mutation; the per-day breakdown is the position query.
 */
export function overallMutationsQuery(
    schema: RhydbSchema,
    filter: RhydbReadFilter,
    options: OverallMutationsOptions,
): Relation {
    const args = {
        minProportion: options.minProportion ?? OVER_TIME_MIN_PROPORTION,
        fields: OVERALL_MUTATION_FIELDS,
    };
    const relation = scoped(schema, filter);
    return options.sequenceType === 'nucleotide' ? relation.mutations(args) : relation.aminoAcidMutations(args);
}

export type OverallMutationRow = {
    mutationFrom: string;
    mutationTo: string;
    /** The gene for an amino-acid mutation; the nucleotide sequence name otherwise. */
    sequenceName: string | null;
    position: number;
    count: number;
    coverage: number;
};

export function readOverallMutations(rows: readonly RhydbRow[]): OverallMutationRow[] {
    return rows.map((row) => ({
        mutationFrom: readText(row, 'mutationFrom'),
        mutationTo: readText(row, 'mutationTo'),
        sequenceName: readOptionalText(row, 'sequenceName'),
        position: readCount(row, 'position'),
        count: readCount(row, 'count'),
        coverage: readCount(row, 'coverage'),
    }));
}

// --- page: one position's symbol distribution over time -----------------

/** The sequence + position one position-over-time query answers for. */
export type PositionTarget = {
    sequenceName: string;
    position: number;
};

/** A run of positions in one segment or gene of the reference. */
export type PositionRange = {
    reference: ReferenceSequence;
    /** 1-based. */
    start: number;
    length: number;
};

/**
 * The symbol every read carries at one position, per day:
 * `filter(location, dates).map({<date> := <date>, sym := <seq>.at(<pos>)}).group(by := {<date>, sym}, aggs := {count := count()})`
 * (the `<date>` pass-through is `groupingColumnsPassThrough`).
 *
 * The computed `sym` column is `.map()`-ed *before* `group`, and both
 * grouping columns are named bare rather than re-assigned inline
 * (`{<date>, sym}`, not `{<date> := <date>, sym := sym}`) — the older RhyDB
 * version behind rsv-a / rsv-b rejects an inline `:=` assignment in a
 * `groupBy` column list outright (400, "expected set literal"; not a timeout).
 * This form parses and runs sub-second on both that version and covid's newer
 * one, so there's no per-instance branching.
 *
 * The caller buckets the days. `schema.groupingDate` is the dictionary date column where
 * the instance has one, else the `DATE32` column.
 */
export function positionOverTimeQuery(schema: RhydbSchema, filter: RhydbReadFilter, target: PositionTarget): Relation {
    return scoped(schema, filter)
        .map({
            ...groupingColumnsPassThrough([schema.groupingDate]),
            sym: field(target.sequenceName).at(target.position),
        })
        .group({ count: count() }, [schema.groupingDate, 'sym']);
}

export type PositionOverTimeRow = {
    /** ISO `yyyy-mm-dd`. */
    date: string;
    /** The symbol at the position: a base / amino acid, `-`, `N`/`X`, or `null` (absent). */
    sym: string | null;
    count: number;
};

export function readPositionOverTime(rows: readonly RhydbRow[], dateColumn: string): PositionOverTimeRow[] {
    return rows.map((row) => ({
        date: readText(row, dateColumn),
        sym: readOptionalText(row, 'sym'),
        count: readCount(row, 'count'),
    }));
}

// --- many positions at once ------------------------------------------------

/**
 * `positionOverTimeQuery` for each target, in one `unionall`, each row tagged with its target's
 * `sequenceName` and `position`. With the same counts as `mutations()`, and much faster when the
 * mutations are known.
 *
 * Each part is filtered by location only. The date bounds go on after the group, against the date
 * renamed to `day` so they aren't pushed back down: inside the parts, the instance evaluates the date
 * filter again for every part, one after the other. The target tag also goes on after the group, as
 * grouping by a literal falls off the bitmap aggregation.
 *
 * TODO: filter the dates inside the parts, before the group, once the instance does that cheaply.
 * In theory that is the better plan.
 */
export function positionsOverTimeQuery(
    schema: RhydbSchema,
    filter: RhydbReadFilter,
    targets: readonly PositionTarget[],
): Relation {
    const location = scoped(schema, filter.locationNames === undefined ? {} : { locationNames: filter.locationNames });
    return unionall(
        targets.map((target) =>
            location
                .map({
                    ...groupingColumnsPassThrough([schema.groupingDate]),
                    sym: field(target.sequenceName).at(target.position),
                })
                .group({ count: count() }, [schema.groupingDate, 'sym'])
                .map({
                    day: field(schema.groupingDate),
                    sequenceName: str(target.sequenceName),
                    position: int(target.position),
                })
                .filter(dateRangeExpression(schema, filter, 'day'))
                .project(['day', 'sym', 'count', 'sequenceName', 'position']),
        ),
    );
}

/** The rows of `positionsOverTimeQuery`, each with its target. */
export function readPositionsOverTime(rows: readonly RhydbRow[]): (PositionOverTimeRow & PositionTarget)[] {
    return rows.map((row) => ({
        date: readText(row, 'day'),
        sym: readOptionalText(row, 'sym'),
        count: readCount(row, 'count'),
        sequenceName: readText(row, 'sequenceName'),
        position: readCount(row, 'position'),
    }));
}
