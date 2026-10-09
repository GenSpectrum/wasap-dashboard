/**
 * The symbol every read carries at one position, per sample, over the whole instance:
 * `map({<sampleId> := <sampleId>, sym := <seq>.at(<pos>)}).group(by := {<sampleId>, sym}, aggs := {count := count()})`.
 *
 * The same shape as `positionOverTimeQuery`, grouped by sample instead of date, and unfiltered.
 * Backs the overview's median amplicon coverage, one query per amplicon (~0.2 s each on covid,
 * all locations; about 1 s for all 96 amplicons together).
 */

import { groupingColumnsPassThrough } from './groupingColumns';
import type { SiloSchema } from './schema';
import { field } from '../transport/expression';
import { count } from '../transport/functions';
import { table, type Relation } from '../transport/relation';
import { readCount, readOptionalText, readText, type RhydbRow } from '../transport/row';

export function positionBySampleQuery(schema: SiloSchema, sequenceName: string, position: number): Relation {
    return table(schema.table)
        .map({ ...groupingColumnsPassThrough([schema.sampleId]), sym: field(sequenceName).at(position) })
        .group({ count: count() }, [schema.sampleId, 'sym']);
}

export type PositionBySampleRow = {
    sampleId: string;
    /** The symbol at the position: a base, `-`, `N`, or `null` (absent). */
    sym: string | null;
    count: number;
};

export function readPositionBySample(rows: readonly RhydbRow[], sampleIdColumn: string): PositionBySampleRow[] {
    return rows.map((row) => ({
        sampleId: readText(row, sampleIdColumn),
        sym: readOptionalText(row, 'sym'),
        count: readCount(row, 'count'),
    }));
}
