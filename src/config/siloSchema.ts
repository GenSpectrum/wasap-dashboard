import type { SiloInstanceConfig } from './wasapPageConfig';
import type { SiloSchema } from '../dataLayer/queries';

/**
 * The `SiloSchema` the `queries/` query catalogue needs, derived from a
 * `WasapPageConfig.silo` block — same pattern as `appConfig.ts`/`wastewaterOrganisms.ts`
 * deriving app config from `WasapPageConfig`. Kept out of `queries/` itself: `components/`
 * already imports from `queries/`, so `queries/` importing `WasapPageConfig` back (from
 * `config/wasapPageConfig`) would be a cycle.
 */
export function siloSchema(silo: SiloInstanceConfig): SiloSchema {
    return {
        table: silo.table,
        locationName: silo.locationNameColumn,
        samplingDate: silo.samplingDateColumn,
        // `dateColumn` is the dictionary-encoded date where the instance has one
        // (covid), otherwise the same DATE32 column as `samplingDate` (rsv-a/b).
        groupingDate: silo.dateColumn,
        groupingDateIsDictionary: silo.dateColumnIsDictionaryEncoded,
        nucleotideSequence: 'main',
    };
}
