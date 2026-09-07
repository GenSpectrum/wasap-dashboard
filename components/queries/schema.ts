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
     * The column to *group* sampling dates by (date extent, the over-time date
     * axis). covid's instance carries a dictionary-encoded copy of the sampling
     * date (`date`) that groups in ~0.2 s vs. ~15 s for the `DATE32` column;
     * rsv-a / rsv-b have no such column, so this is just `samplingDate` there
     * (their datasets are small enough that the `DATE32` grouping is tolerable).
     */
    groupingDate: string;
};
