import { readCounts, READS } from './counts';
import { scoped, type RhydbReadFilter } from './filter';
import type { RhydbSchema } from './schema';
import { table, type Relation } from '../transport/relation';
import { readCount, type RhydbRow } from '../transport/row';

/** Total reads the filter admits, as a single row. */
export function totalReadCountQuery(schema: RhydbSchema, filter: RhydbReadFilter = {}): Relation {
    return scoped(schema, filter).group(readCounts());
}

/**
 * The number of distinct values of a column, as a single row — the column is grouped, then the
 * groups are counted, so only the count crosses the wire. Unfiltered, for the overview page's
 * stats. `column` must be dictionary-encoded or indexed: grouping on one such column is cheap,
 * while adding more columns to a group multiplies its cost, which is why the sample count doesn't
 * read off `sampleOverviewQuery`.
 */
export function distinctCountQuery(schema: RhydbSchema, column: string): Relation {
    return table(schema.table).group(readCounts(), [column]).group(readCounts());
}

/** The reads a total-count query counted, off its single row. */
export function readTotalCount(rows: readonly RhydbRow[]): number {
    if (rows.length !== 1) {
        throw new Error(`Expected one total-count row, got ${rows.length}`);
    }
    return readCount(rows[0], READS);
}
