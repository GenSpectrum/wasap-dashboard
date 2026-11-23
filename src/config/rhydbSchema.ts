import type { RhydbInstanceConfig } from './organismConfig';
import type { RhydbSchema } from '../dataLayer/queries';

/**
 * The `RhydbSchema` the `queries/` query catalogue needs, derived from a
 * `OrganismConfig.rhydb` block — same pattern as `appConfig.ts`/`wastewaterOrganisms.ts`
 * deriving app config from `OrganismConfig`. Kept out of `queries/` itself: `components/`
 * already imports from `queries/`, so `queries/` importing `OrganismConfig` back (from
 * `config/organismConfig`) would be a cycle.
 */
export function rhydbSchema(rhydb: RhydbInstanceConfig): RhydbSchema {
    return {
        table: rhydb.table,
        locationName: rhydb.locationNameColumn,
        samplingDate: rhydb.samplingDateColumn,
        nucleotideSequence: 'main',
        sampleId: rhydb.sampleIdColumn,
        batchId: rhydb.batchIdColumn,
    };
}
