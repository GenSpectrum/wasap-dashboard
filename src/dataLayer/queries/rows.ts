/**
 * Reading the rows a catalogue query returned into the values the components use.
 *
 * Strict on shape (a missing column throws and names itself), permissive on
 * values.
 */

import { READS } from './catalogue';
import type { SiloSchema } from './schema';
import { readCount, readText, type RhydbRow } from '../transport/row';

/**
 * The reads a total-count query's rows add up to.
 *
 * totalReadCountQuery groups by location rather than issuing a bare count (a
 * temporary workaround for a SILO performance bug — see its docstring), so
 * this sums across however many rows came back — one per location, every one
 * counted, none dropped for a blank name. Zero rows means zero reads.
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

export type LocationOverview = {
    name: string;
    sampleCount: number;
    /** The sampling date of the most recently collected sample at this location. */
    mostRecentSampleDate: string;
};

/**
 * `locationSampleOverviewQuery`'s one-row-per-sample result, folded into one entry per
 * location — how many samples it has, and the most recent of their sampling dates. Sorted by
 * location name. Rows with a blank location are dropped, the same as `readNamedCounts`.
 */
export function readLocationOverview(rows: readonly RhydbRow[], schema: SiloSchema): LocationOverview[] {
    const byLocation = new Map<string, { sampleCount: number; mostRecentSampleDate: string }>();
    for (const row of rows) {
        const name = readText(row, schema.locationName);
        if (name === '') {
            continue;
        }
        const date = readText(row, schema.groupingDate);
        const existing = byLocation.get(name);
        if (existing === undefined) {
            byLocation.set(name, { sampleCount: 1, mostRecentSampleDate: date });
        } else {
            existing.sampleCount += 1;
            if (date > existing.mostRecentSampleDate) {
                existing.mostRecentSampleDate = date;
            }
        }
    }
    return [...byLocation.entries()]
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => a.name.localeCompare(b.name));
}
