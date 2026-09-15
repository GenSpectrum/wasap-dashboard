/**
 * Reading the rows a catalogue query returned into the values the components use.
 *
 * Strict on shape (a missing column throws and names itself), permissive on
 * values.
 */

import { READS } from './catalogue';
import { readCount, readText, type RhydbRow } from '../transport/row';

/**
 * The reads a total-count query's rows add up to.
 *
 * totalReadCountQuery groups by location rather than issuing a bare count (a
 * SILO performance bug), so this sums across however many rows came back —
 * one per location, every one counted, none dropped for a blank name. Zero
 * rows means zero reads.
 */
export function readTotalCount(rows: readonly RhydbRow[]): number {
    return rows.reduce((total, row) => total + readCount(row, READS), 0);
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
    return { min: readText(rows[0], column), max: readText(rows[rows.length - 1], column) };
}
