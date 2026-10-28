/**
 * What the counting queries share: they all name their `count()` aggregate `READS`, and a
 * `{ <column>, n }` result reads as named counts.
 */

import type { Expr } from '../transport/expression';
import { count } from '../transport/functions';
import { readCount, readText, type RhydbRow } from '../transport/row';

/** The aggregate every counting query names. */
export const READS = 'n';

/** The aggregates of a counting query: just the count, named `READS`. */
export function readCounts(): Record<string, Expr> {
    return { [READS]: count() };
}

export type NamedCount = { name: string; count: number };

/** `{ <column>, n }` rows → `{ name, count }`, dropping a null/blank name. */
export function readNamedCounts(rows: readonly RhydbRow[], column: string): NamedCount[] {
    return rows
        .map((row) => ({ name: readText(row, column), count: readCount(row, READS) }))
        .filter((entry) => entry.name !== '');
}
