import { readCounts } from './counts';
import type { RhydbSchema } from './schema';
import { table, type Relation } from '../transport/relation';

/**
 * Every distinct value of a string column, with its read count.
 *
 * Unfiltered — a filter dropdown offers every value the instance holds.
 * Grouping a dictionary/indexed column is close to free. Used for the sampling
 * location list; `field` must name a dictionary or indexed string column.
 */
export function stringFieldValuesQuery(schema: RhydbSchema, field: string): Relation {
    return table(schema.table).group(readCounts(), [field]);
}
