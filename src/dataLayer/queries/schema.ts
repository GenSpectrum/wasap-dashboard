/**
 * The column names the SILO query catalogue needs from an instance.
 *
 * SILO exposes no field semantics — a query names raw columns — so the
 * catalogue is handed this per instance. `src/` builds it from the per-organism
 * `WasapPageConfig.silo` block and passes it down through the connection
 * context (`dataLayer/hooks/connection.tsx`).
 */
export type SiloSchema = {
    /** Root table. `default` for every current W-ASAP instance. */
    table: string;
    /** Dictionary / indexed-string column holding the human-readable sampling location. */
    locationName: string;
    /**
     * The `DATE32` sampling-date column, present on every instance. Kept for
     * reference; date *filters* and *grouping* both go through `groupingDate`.
     */
    samplingDate: string;
    /**
     * The column to *group* and *filter* sampling dates by. covid carries a
     * dictionary-encoded copy of the sampling date (`date`); a plain range
     * *filter* on the `DATE32` column instead costs ~5 s on covid's ~600 M
     * reads (doc 10). rsv-a / rsv-b have only `samplingDate`, so `groupingDate`
     * is that same `DATE32` column there.
     *
     * Grouping a mapped `at()` column alongside it is sub-second on both —
     * verified live on rsv-a's ~17 M reads — as long as the query uses the
     * `.map(sym := …).groupBy(count(), {groupingDate, sym})` shape
     * (`positionOverTimeQuery`). An earlier, unverified assumption that this
     * *always* times out on a `DATE32` column turned out to be a different bug
     * (a `groupBy` column-list syntax rejected outright by the older SILO
     * version behind rsv-a / rsv-b — see that function's docstring), not a
     * performance wall. Whether grouping by `DATE32` itself degrades at
     * covid-scale row counts (~600 M vs rsv's ~17 M) is still untested.
     */
    groupingDate: string;
    /**
     * Whether `groupingDate` is dictionary-encoded (holds an ISO string).
     * `true` on covid (`date`): filters use a plain string comparison, and SILO
     * *rejects* a `::date` cast against it. `false` on rsv-a / rsv-b
     * (`samplingDate` is `DATE32`): filters need the `'yyyy-mm-dd'::date` cast.
     *
     * TODO: temporary. This flag only exists because covid has a dictionary
     * `date` column and rsv-a / rsv-b do not yet. When every instance has one,
     * `groupingDate` is always the dict column, this is always `true`, and both
     * this field and `dateComparand` (`filter.ts`) go away.
     */
    groupingDateIsDictionary: boolean;
    /** The single nucleotide-sequence column (`main` on every current instance). */
    nucleotideSequence: string;
    /** Dictionary-encoded column holding the sample ID every amplicon sequence carries. */
    sampleId: string;
    /** Dictionary-encoded column holding the batch ID every amplicon sequence carries. */
    batchId: string;
};
