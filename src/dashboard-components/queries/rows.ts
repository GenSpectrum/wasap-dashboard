/**
 * Reading the rows a catalogue query returned into the values the components use.
 *
 * Strict on shape (a missing column throws and names itself), permissive on
 * values.
 */

import { readCount, readText, type RhydbRow } from '../../rhydb/row';
import { READS } from './catalogue';

/** The single `{ n }` row of a total-count query. Zero rows means zero reads. */
export function readTotalCount(rows: readonly RhydbRow[]): number {
    if (rows.length === 0) {
        return 0;
    }
    return readCount(rows[0]!, READS);
}

export type NamedCount = { name: string; count: number };

/** `{ <column>, n }` rows → `{ name, count }`, dropping a null/blank name. */
export function readNamedCounts(rows: readonly RhydbRow[], column: string): NamedCount[] {
    return rows
        .map((row) => ({ name: readText(row, column), count: readCount(row, READS) }))
        .filter((entry) => entry.name !== '');
}

/** The oldest and newest value of a sorted `{ <column>, n }` result. */
export function readValueExtent(rows: readonly RhydbRow[], column: string): { min: string; max: string } | undefined {
    if (rows.length === 0) {
        return undefined;
    }
    return { min: readText(rows[0]!, column), max: readText(rows[rows.length - 1]!, column) };
}
