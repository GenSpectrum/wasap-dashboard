import { readCounts } from './counts';
import { scoped, type RhydbReadFilter } from './filter';
import type { RhydbSchema } from './schema';
import { field } from '../transport/expression';
import { type Relation } from '../transport/relation';
import { readText, type RhydbRow } from '../transport/row';

/**
 * Every distinct sampling date in the dataset (oldest first), with its read
 * count, grouped on the dictionary-encoded date column where the instance has
 * one. The date extent is the first and last row; the caller reads min/max off
 * the sorted result rather than paying for two queries.
 */
export function samplingDatesQuery(schema: RhydbSchema, filter: RhydbReadFilter = {}): Relation {
    return scoped(schema, filter).group(readCounts(), [schema.groupingDate]).order(field(schema.groupingDate).asc());
}

/** The oldest and newest value of a sorted `{ <column>, n }` result. */
export function readValueExtent(rows: readonly RhydbRow[], column: string): { min: string; max: string } | undefined {
    if (rows.length === 0) {
        return undefined;
    }
    return { min: readText(rows[0], column), max: readText(rows[rows.length - 1], column) };
}
