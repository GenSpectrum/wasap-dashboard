import { useMemo } from 'react';

import { AmpliconCooccurrenceTable } from './AmpliconCooccurrenceTable';
import { useCooccurrenceJaccard } from './useCooccurrenceJaccard';
import { type AmpliconsConfig } from '../../../amplicons/ampliconsConfig';
import { mutationsByAmplicon } from '../../../amplicons/mutationsByAmplicon';
import { type Amplicon } from '../../../amplicons/primerBed';
import { useAmplicons } from '../../../amplicons/useAmplicons';
import {
    allRowsOf,
    cooccurrenceRows,
    useAmpliconCooccurrence,
    type CooccurrenceRow,
} from '../../../dataLayer/hooks/ampliconCooccurrence';
import { useDateAxis, type DateAxis } from '../../../dataLayer/hooks/mutationsOverTime';
import { normalizeFilter, type SiloReadFilter } from '../../../dataLayer/queries';
import { type ClusterJaccardSource } from '../../../externalData/lapis/getClusterJaccards';
import { type TemporalGranularity } from '../../../types/dashboardComponents';
import { TitledPanel } from '../../shared/TitledPanel';
import { ErrorDisplay } from '../../shared/error-display';
import { LoadingDisplay } from '../../shared/loading-display';
import { NoDataDisplay } from '../../shared/no-data-display';

const NO_ROWS: CooccurrenceRow[] = [];

type SectionProps = {
    amplicons: AmpliconsConfig;
    filter: SiloReadFilter;
    granularity: TemporalGranularity;
    /** All the variant's mutations, before the Jaccard threshold: the clusters are looked for among these. */
    candidateMutations: string[];
    /** The clusters with a lower Jaccard index are left out (without a `jaccardSource`, none are). */
    minJaccard: number;
    /** Where to get the Jaccard indices of the clusters from; none without. */
    jaccardSource: ClusterJaccardSource | undefined;
};

/**
 * The variant's mutations (nucleotide ones, all of them, not only those specific enough on their
 * own), grouped by the amplicon they are in, and for each amplicon with two or more of them: the
 * clusters of them that reads carry together, over time, those specific enough to the variant.
 */
export function AmpliconCooccurrenceSection(props: SectionProps) {
    const amplicons = useAmplicons(props.amplicons);
    const dateAxis = useDateAxis(props.filter, props.granularity);

    const error = amplicons.error ?? dateAxis.error;
    return (
        <TitledPanel title='Co-occurrence within amplicons' info={<CooccurrenceInfo />} boxed={false}>
            {error ? (
                <ErrorDisplay error={error} />
            ) : amplicons.data === undefined || dateAxis.data === undefined ? (
                <LoadingDisplay />
            ) : (
                <Cooccurrences {...props} ampliconList={amplicons.data} dateAxis={dateAxis.data} />
            )}
        </TitledPanel>
    );
}

function CooccurrenceInfo() {
    return (
        <div className='w-96 space-y-2 text-sm font-normal text-gray-700'>
            <p>
                A read comes from one amplicon, so the variant&apos;s mutations in the same amplicon can be checked for
                being on the same read. A row is a cluster of them that reads carry together: the share of the reads
                covering all of the amplicon&apos;s mutation positions that carry at least the cluster&apos;s mutations.
            </p>
            <p>
                The clusters are looked for among all of the variant&apos;s mutations, also those that aren&apos;t
                specific to it on their own, and only those with a Jaccard index of at least the minimum are shown.
            </p>
        </div>
    );
}

function Cooccurrences({
    filter,
    granularity,
    candidateMutations,
    minJaccard,
    jaccardSource,
    ampliconList,
    dateAxis,
}: SectionProps & { ampliconList: Amplicon[]; dateAxis: DateAxis }) {
    const { groups } = useMemo(
        () => mutationsByAmplicon(candidateMutations, ampliconList),
        [candidateMutations, ampliconList],
    );

    const cooccurrence = useAmpliconCooccurrence(
        normalizeFilter(filter).locationName,
        groups,
        dateAxis.requestedDateRanges,
        granularity,
    );

    const rows = useMemo(
        () => cooccurrence.data && cooccurrenceRows(cooccurrence.data, dateAxis.totalCountsByBucket).flatMap(allRowsOf),
        [cooccurrence.data, dateAxis],
    );
    const { jaccardIndices, isLoading: isJaccardLoading } = useCooccurrenceJaccard(rows ?? NO_ROWS, jaccardSource);

    // The clusters specific enough to the variant, once all their Jaccard indices are in.
    const shownRows = useMemo(() => {
        if (rows === undefined || isJaccardLoading) {
            return undefined;
        }
        return jaccardIndices === undefined
            ? rows
            : rows.filter((row) => (jaccardIndices[row.label] ?? 0) >= minJaccard);
    }, [rows, isJaccardLoading, jaccardIndices, minJaccard]);

    if (cooccurrence.error) {
        return <ErrorDisplay error={cooccurrence.error} />;
    }
    if (shownRows === undefined) {
        return <LoadingDisplay />;
    }
    if (shownRows.length === 0) {
        return (
            <NoDataDisplay
                message={
                    jaccardIndices === undefined
                        ? "No clusters of the variant's mutations on reads."
                        : `No clusters of the variant's mutations on reads with a Jaccard index of at least ${minJaccard}.`
                }
            />
        );
    }
    return (
        <AmpliconCooccurrenceTable
            rows={shownRows}
            dateRanges={dateAxis.requestedDateRanges}
            jaccardIndices={jaccardIndices}
            pageSizes={[20, 50, 100, 250]}
        />
    );
}
