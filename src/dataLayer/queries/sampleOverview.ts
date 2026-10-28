import { readCounts, READS } from './counts';
import type { RhydbSchema } from './schema';
import { table, type Relation } from '../transport/relation';
import { readCount, readText, type RhydbRow } from '../transport/row';

/**
 * Every distinct sample the instance holds, with its location, sampling date, batch and read
 * count — one row each. Unfiltered, for the overview page's per-location table and its
 * samples-over-time plot.
 *
 * RhyDB's `group` has only `count()`, no `max`/`countDistinct`, so this groups by all four
 * columns together rather than aggregating them: the resulting row count is the same whether
 * grouping by `sampleId` alone or by all four (checked against the live instances), meaning a
 * sample always carries exactly one location, one date and one batch. The caller reads the rows
 * with `readSampleOverview`; `useLocationOverview` folds them into a per-location summary with
 * `readLocationOverview`.
 */
export function sampleOverviewQuery(schema: RhydbSchema): Relation {
    return table(schema.table).group(readCounts(), [
        schema.locationName,
        schema.groupingDate,
        schema.sampleId,
        schema.batchId,
    ]);
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
export function readSampleOverview(rows: readonly RhydbRow[], schema: RhydbSchema): SampleOverview[] {
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
