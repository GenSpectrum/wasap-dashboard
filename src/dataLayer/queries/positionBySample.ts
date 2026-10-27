/**
 * The symbol every read carries at one position, per sample, over the whole instance:
 * `map({<sampleId> := <sampleId>, sym := <seq>.at(<pos>)}).group(by := {<sampleId>, sym}, aggs := {count := count()})`.
 *
 * The same shape as `positionOverTimeQuery`, grouped by sample instead of date, and unfiltered.
 * Backs the overview's median amplicon coverage, all amplicons in one `unionall`
 * (`positionsBySampleQuery`).
 */

import { groupingColumnsPassThrough } from './groupingColumns';
import type { RhydbSchema } from './schema';
import { field, int } from '../transport/expression';
import { count } from '../transport/functions';
import { table, unionall, type Relation } from '../transport/relation';
import { readCount, readOptionalText, readText, type RhydbRow } from '../transport/row';

function positionBySampleQuery(schema: RhydbSchema, sequenceName: string, position: number): Relation {
    return table(schema.table)
        .map({ ...groupingColumnsPassThrough([schema.sampleId]), sym: field(sequenceName).at(position) })
        .group({ count: count() }, [schema.sampleId, 'sym']);
}

/**
 * `positionBySampleQuery` for each position, in one `unionall`, each row tagged with its position.
 * The tag is mapped on after the group: grouping by a literal column falls off RhyDB's bitmap
 * aggregation and times out.
 */
export function positionsBySampleQuery(
    schema: RhydbSchema,
    sequenceName: string,
    positions: readonly number[],
): Relation {
    return unionall(
        positions.map((position) =>
            positionBySampleQuery(schema, sequenceName, position).map({
                ...groupingColumnsPassThrough([schema.sampleId, 'sym', 'count']),
                position: int(position),
            }),
        ),
    );
}

export type PositionBySampleRow = {
    sampleId: string;
    /** The symbol at the position: a base, `-`, `N`, or `null` (absent). */
    sym: string | null;
    count: number;
    position: number;
};

export function readPositionsBySample(rows: readonly RhydbRow[], sampleIdColumn: string): PositionBySampleRow[] {
    return rows.map((row) => ({
        sampleId: readText(row, sampleIdColumn),
        sym: readOptionalText(row, 'sym'),
        count: readCount(row, 'count'),
        position: readCount(row, 'position'),
    }));
}
