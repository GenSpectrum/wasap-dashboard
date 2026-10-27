import type { RhydbInstanceConfig } from './wasapPageConfig';
import type { RhydbSchema } from '../dataLayer/queries';

/**
 * The `RhydbSchema` the `queries/` query catalogue needs, derived from a
 * `WasapPageConfig.rhydb` block — same pattern as `appConfig.ts`/`wastewaterOrganisms.ts`
 * deriving app config from `WasapPageConfig`. Kept out of `queries/` itself: `components/`
 * already imports from `queries/`, so `queries/` importing `WasapPageConfig` back (from
 * `config/wasapPageConfig`) would be a cycle.
 */
export function rhydbSchema(rhydb: RhydbInstanceConfig): RhydbSchema {
    return {
        table: rhydb.table,
        locationName: rhydb.locationNameColumn,
        samplingDate: rhydb.samplingDateColumn,
        // `dateColumn` is the dictionary-encoded date where the instance has one
        // (covid), otherwise the same DATE32 column as `samplingDate` (rsv-a/b).
        groupingDate: rhydb.dateColumn,
        groupingDateIsDictionary: rhydb.dateColumnIsDictionaryEncoded,
        nucleotideSequence: 'main',
        sampleId: rhydb.sampleIdColumn,
        batchId: rhydb.batchIdColumn,
    };
}
