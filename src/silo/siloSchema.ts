import type { SiloSchema } from 'wasap-components/queries';

import type { SiloInstanceConfig } from '../components/views/wasap/wasapPageConfig';

/**
 * The `SiloSchema` the `components/` query catalogue needs, from a
 * `WasapPageConfig.silo` block. Kept here rather than in `components/` because
 * `WasapPageConfig` lives in `src/` and `components/` must not import from it.
 */
export function siloSchema(silo: SiloInstanceConfig): SiloSchema {
    return {
        table: silo.table,
        locationName: silo.locationNameColumn,
        samplingDate: silo.samplingDateColumn,
        // `dateColumn` is the dictionary-encoded date where the instance has one
        // (covid), otherwise the same DATE32 column as `samplingDate` (rsv-a/b).
        groupingDate: silo.dateColumn,
    };
}
