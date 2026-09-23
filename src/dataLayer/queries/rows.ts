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

export type SampleOverview = {
    locationName: string;
    /** The sampling date, from `schema.groupingDate`. */
    date: string;
    sampleId: string;
    batchId: string;
    reads: number;
};

/**
 * `sampleOverviewQuery`'s result, read one entry per sample. Rows with a blank location are
 * dropped, the same as `readNamedCounts`. The overview page's per-location table folds these
 * with `readLocationOverview`; its samples-over-time plot uses them as they are.
 */
export function readSampleOverview(rows: readonly RhydbRow[], schema: SiloSchema): SampleOverview[] {
    return rows
        .map((row) => ({
            locationName: readText(row, schema.locationName),
            date: readText(row, schema.groupingDate),
            sampleId: readText(row, schema.sampleId),
            batchId: readText(row, schema.batchId),
            reads: readCount(row, READS),
        }))
        .filter((sample) => sample.locationName !== '');
}

export type LocationOverview = {
    name: string;
    sampleCount: number;
    /** The sampling date of the most recently collected sample at this location. */
    mostRecentSampleDate: string;
};

/**
 * `readSampleOverview`'s one-entry-per-sample result, folded into one entry per location — how
 * many samples it has, and the most recent of their sampling dates. Sorted by location name.
 */
export function readLocationOverview(samples: readonly SampleOverview[]): LocationOverview[] {
    const byLocation = new Map<string, { sampleCount: number; mostRecentSampleDate: string }>();
    for (const sample of samples) {
        const existing = byLocation.get(sample.locationName);
        if (existing === undefined) {
            byLocation.set(sample.locationName, { sampleCount: 1, mostRecentSampleDate: sample.date });
        } else {
            existing.sampleCount += 1;
            if (sample.date > existing.mostRecentSampleDate) {
                existing.mostRecentSampleDate = sample.date;
            }
        }
    }
    return [...byLocation.entries()]
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => a.name.localeCompare(b.name));
}
