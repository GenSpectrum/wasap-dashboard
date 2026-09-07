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
     * `DATE32` sampling-date column — present on every instance, and what date
     * filters compare against (`'yyyy-mm-dd'::date`). Date *grouping* over this
     * column is slow at scale; that is a separate concern handled in the
     * over-time phase (doc 04).
     */
    samplingDate: string;
};
