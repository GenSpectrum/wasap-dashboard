/**
 * The column names the SILO query catalogue needs from an instance.
 *
 * SILO exposes no field semantics — a query names raw columns — so the
 * catalogue is handed this per instance. `src/` builds it from the per-organism
 * `WasapPageConfig.silo` block and passes it down through the connection
 * context (`components/data/connection.tsx`).
 */
export type SiloSchema = {
    /** Root table. `default` for every current W-ASAP instance. */
    table: string;
    /** Dictionary / indexed-string column holding the human-readable sampling location. */
    locationName: string;
    /**
     * The `DATE32` sampling-date column, present on every instance. Date
     * *filters* compare against this one with a `'yyyy-mm-dd'::date` cast.
     */
    samplingDate: string;
    /**
     * The column to *group* sampling dates by. covid carries a
     * dictionary-encoded copy of the sampling date (`date`); grouping a mapped
     * `at()` column by it is fine, by the `DATE32` column it times out (doc 10),
     * so rsv-a / rsv-b — which only have `samplingDate` — cannot do the
     * over-time pileup until they gain a dictionary date column.
     */
    groupingDate: string;
    /** The single nucleotide-sequence column (`main` on every current instance). */
    nucleotideSequence: string;
};
