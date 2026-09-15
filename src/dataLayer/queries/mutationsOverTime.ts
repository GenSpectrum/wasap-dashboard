/**
 * The SILO queries behind `gs-mutations-over-time`.
 *
 * There is no over-time / coverage primitive in SaneQL, and the batching
 * options don't hold (grouping by a `unionAll` tag literal, or by the `DATE32`
 * column alongside a mapped `at()`, both time out — see
 * standalone-wasap/10-silo-over-time-findings.md). So the matrix is assembled
 * from **one symbol distribution per position, per day**, and the two queries
 * here back the two data hooks in `components/data/mutationsOverTime.ts`:
 *
 *   `overallMutationsQuery` — one `mutations()` call for the *metadata*: which
 *     mutations get a grid row, and each one's proportion over the whole shown
 *     span (drives the "minimum proportion" filter across pages).
 *   `positionOverTimeQuery` — one `map(sym := seq.at(pos)).groupBy(count(), {date, sym})`
 *     per distinct position of the visible *page*: the full symbol distribution
 *     there, per day. `coverage = Σ count(known symbols)`,
 *     `count = Σ count(alt)`. No date filter — the whole range comes back and
 *     is bucketed client-side, so one cached result serves any window.
 */

import { scoped, type SiloReadFilter } from './filter';
import type { SiloSchema } from './schema';
import { field } from '../transport/expression';
import { count } from '../transport/functions';
import { type Relation } from '../transport/relation';
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
    /** Restrict to specific sequence columns (genes / the nucleotide sequence); omit for all. */
    sequenceNames?: readonly string[];
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
    schema: SiloSchema,
    filter: SiloReadFilter,
    options: OverallMutationsOptions,
): Relation {
    const args = {
        minProportion: options.minProportion ?? OVER_TIME_MIN_PROPORTION,
        sequenceNames: options.sequenceNames,
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

/**
 * The symbol every read carries at one position, per day:
 * `filter(location).map({sym := <seq>.at(<pos>)}).groupBy({count := count()}, {<date>, sym})`.
 *
 * The computed `sym` column is `.map()`-ed *before* `groupBy`, and both
 * grouping columns are named bare rather than re-assigned inline
 * (`{<date>, sym}`, not `{<date> := <date>, sym := sym}`) — the older SILO
 * version behind rsv-a / rsv-b rejects an inline `:=` assignment in a
 * `groupBy` column list outright (400, "expected set literal"; not a timeout).
 * This form parses and runs sub-second on both that version and covid's newer
 * one, so there's no per-instance branching.
 *
 * Location only — no date bounds — so the whole date range is returned and the
 * caller buckets it. `schema.groupingDate` is the dictionary date column where
 * the instance has one, else the `DATE32` column.
 */
export function positionOverTimeQuery(
    schema: SiloSchema,
    filter: Pick<SiloReadFilter, 'locationName'>,
    target: PositionTarget,
): Relation {
    return scoped(schema, { locationName: filter.locationName })
        .map({ sym: field(target.sequenceName).at(target.position) })
        .groupBy({ count: count() }, [schema.groupingDate, 'sym']);
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
