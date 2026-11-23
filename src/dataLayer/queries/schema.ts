/**
 * The column names the RhyDB query catalogue needs from an instance.
 *
 * RhyDB exposes no field semantics — a query names raw columns — so the
 * catalogue is handed this per instance. `src/` builds it from the per-organism
 * `OrganismConfig.rhydb` block and passes it down through the connection
 * context (`dataLayer/hooks/connection.tsx`).
 */
export type RhydbSchema = {
    /** Root table. `data` for every current W-ASAP instance. */
    table: string;
    /** Dictionary / indexed-string column holding the human-readable sampling location. */
    locationName: string;
    /**
     * The indexed `DATE32` sampling-date column, present on every instance. Date filters
     * (`'yyyy-mm-dd'::date` casts) and date grouping both go through it.
     */
    samplingDate: string;
    /** The single nucleotide-sequence column (`main` on every current instance). */
    nucleotideSequence: string;
    /** Dictionary-encoded column holding the sample ID every amplicon sequence carries. */
    sampleId: string;
    /** Dictionary-encoded column holding the batch ID every amplicon sequence carries. */
    batchId: string;
};
