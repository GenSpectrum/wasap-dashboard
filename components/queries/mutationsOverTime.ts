/**
 * The SILO queries behind `gs-mutations-over-time`.
 *
 * There is no over-time / coverage primitive in SaneQL, and the batching
 * options don't hold (grouping by a `unionAll` tag literal, or by the `DATE32`
 * column alongside a mapped `at()`, both time out — see
 * standalone-wasap/10-silo-over-time-findings.md). So the matrix is assembled
 * from a **symbol pileup per position**:
 *
 *   phase 1 — one `mutations()` call: the row list and each row's overall
 *             proportion (drives the "minimum proportion" filter across pages).
 *   phase 2 — one `groupBy(count(), {date, seq.at(pos)})` per distinct position
 *             of the visible page: the full symbol distribution there, per day.
 *             `coverage = Σ count(known symbols)`, `count = Σ count(alt)`.
 *             No date filter — the whole range comes back and is bucketed
 *             client-side, so one cached result serves any window.
 */

import { field } from '../rhydb/expression';
import { count } from '../rhydb/functions';
import { type Relation } from '../rhydb/relation';
import { readCount, readOptionalText, readText, type RhydbRow } from '../rhydb/row';
import { scoped, type SiloReadFilter } from './filter';
import type { SiloSchema } from './schema';

export type OverTimeSequenceType = 'nucleotide' | 'amino acid';

/** Below this overall proportion a mutation is not offered as a row (matches the old LAPIS path). */
export const OVER_TIME_MIN_PROPORTION = 0.001;

// --- phase 1: the row list -------------------------------------------------

const SPECTRUM_FIELDS = ['mutationFrom', 'mutationTo', 'sequenceName', 'position', 'count', 'coverage'] as const;

export type MutationSpectrumOptions = {
    sequenceType: OverTimeSequenceType;
    /** Restrict to specific sequence columns (genes / the nucleotide sequence); omit for all. */
    sequenceNames?: readonly string[];
    /** Defaults to `OVER_TIME_MIN_PROPORTION`. */
    minProportion?: number;
};

/**
 * `{ mutationFrom, mutationTo, sequenceName, position, count, coverage }` per mutation over the
 * reads the filter admits. One call, scoped to the shown date span.
 */
export function mutationSpectrumQuery(
    schema: SiloSchema,
    filter: SiloReadFilter,
    options: MutationSpectrumOptions,
): Relation {
    const args = {
        minProportion: options.minProportion ?? OVER_TIME_MIN_PROPORTION,
        sequenceNames: options.sequenceNames,
        fields: SPECTRUM_FIELDS,
    };
    const relation = scoped(schema, filter);
    return options.sequenceType === 'nucleotide' ? relation.mutations(args) : relation.aminoAcidMutations(args);
}

export type MutationSpectrumRow = {
    mutationFrom: string;
    mutationTo: string;
    /** The gene for an amino-acid mutation; the nucleotide sequence name otherwise. */
    sequenceName: string | null;
    position: number;
    count: number;
    coverage: number;
};

export function readMutationSpectrum(rows: readonly RhydbRow[]): MutationSpectrumRow[] {
    return rows.map((row) => ({
        mutationFrom: readText(row, 'mutationFrom'),
        mutationTo: readText(row, 'mutationTo'),
        sequenceName: readOptionalText(row, 'sequenceName'),
        position: readCount(row, 'position'),
        count: readCount(row, 'count'),
        coverage: readCount(row, 'coverage'),
    }));
}

// --- phase 2: the per-position pileup over time ---------------------------

/** The sequence + position one pileup query answers for. */
export type PileupTarget = {
    sequenceName: string;
    position: number;
};

/**
 * The symbol every read carries at one position, per day:
 * `filter(location).groupBy({count := count()}, {<date> := <date>, sym := <seq>.at(<pos>)})`.
 *
 * Location only — no date bounds — so the whole date range is returned and the
 * caller buckets it. `schema.groupingDate` is the dictionary date column where
 * the instance has one; on a `DATE32`-only instance this query times out (known
 * gap, doc 10).
 */
export function positionPileupQuery(
    schema: SiloSchema,
    filter: Pick<SiloReadFilter, 'locationName'>,
    target: PileupTarget,
): Relation {
    return scoped(schema, { locationName: filter.locationName }).groupBy(
        { count: count() },
        { [schema.groupingDate]: field(schema.groupingDate), sym: field(target.sequenceName).at(target.position) },
    );
}

export type PositionPileupRow = {
    /** ISO `yyyy-mm-dd`. */
    date: string;
    /** The symbol at the position: a base / amino acid, `-`, `N`/`X`, or `null` (absent). */
    sym: string | null;
    count: number;
};

export function readPositionPileup(rows: readonly RhydbRow[], dateColumn: string): PositionPileupRow[] {
    return rows.map((row) => ({
        date: readText(row, dateColumn),
        sym: readOptionalText(row, 'sym'),
        count: readCount(row, 'count'),
    }));
}
