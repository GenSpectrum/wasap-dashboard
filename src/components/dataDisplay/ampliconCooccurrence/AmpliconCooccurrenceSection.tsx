import { useMemo } from 'react';

import { CooccurrenceTable } from './CooccurrenceTable';
import { useCooccurrenceJaccard } from './useCooccurrenceJaccard';
import { type AmpliconsConfig } from '../../../amplicons/ampliconsConfig';
import { mutationsByAmplicon } from '../../../amplicons/mutationsByAmplicon';
import { type Amplicon } from '../../../amplicons/primerBed';
import { useAmplicons } from '../../../amplicons/useAmplicons';
import {
    allRowsOf,
    cooccurrenceRows,
    useAmpliconCooccurrence,
    type AmpliconRows,
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
 * own), grouped by the amplicon they are in, and for each amplicon with two or more of them a
 * table: the clusters of them that reads carry together, over time, those specific enough to the
 * variant.
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
            <p>
                A row per amplicon, of all of its mutations together, opens up (click it) to its other rows: where all
                of its mutations together are specific enough, also the rows leaving one of them out, whatever their
                Jaccard index: a mutation whose row has a much lower one is what tells the variant apart, one whose row
                has about the same adds little. &quot;Any 3&quot; counts the reads and sequences with at least 3 of the
                4 mutations, whichever they are.
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

    const ampliconRows = useMemo(
        () => cooccurrence.data && cooccurrenceRows(cooccurrence.data, dateAxis.totalCountsByBucket),
        [cooccurrence.data, dateAxis],
    );
    const rows = useMemo(() => ampliconRows?.flatMap(allRowsOf) ?? NO_ROWS, [ampliconRows]);
    const { jaccardIndices, isLoading: isJaccardLoading } = useCooccurrenceJaccard(rows, jaccardSource);

    // Per amplicon, the rows specific enough to the variant, once all their Jaccard indices are in.
    const shownAmplicons = useMemo(() => {
        if (ampliconRows === undefined || isJaccardLoading) {
            return undefined;
        }
        return jaccardIndices === undefined
            ? ampliconRows
            : ampliconRows.flatMap((amplicon) => specificRows(amplicon, jaccardIndices, minJaccard) ?? []);
    }, [ampliconRows, isJaccardLoading, jaccardIndices, minJaccard]);

    if (cooccurrence.error) {
        return <ErrorDisplay error={cooccurrence.error} />;
    }
    if (shownAmplicons === undefined) {
        return <LoadingDisplay />;
    }
    if (shownAmplicons.length === 0) {
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
        <CooccurrenceTable
            amplicons={shownAmplicons}
            dateRanges={dateAxis.requestedDateRanges}
            jaccardIndices={jaccardIndices}
            minJaccard={minJaccard}
        />
    );
}

/**
 * The rows of an amplicon specific enough to the variant: those of a Jaccard index of at least
 * `minJaccard`, and where the row of all of its mutations is one of them, all of the rows leaving
 * one or two of them out, whatever their Jaccard index: what matters about them is how far below
 * that of all of the mutations it is. The row of any `k` of the mutations is there whenever one of
 * its clusters is. The row of all of the mutations and those of each mutation on its own are there
 * whenever any other is, to compare them to; a single mutation alone doesn't make the amplicon
 * shown (the mutations over time have them). Nothing where nothing is specific enough (exported
 * for tests).
 */
export function specificRows(
    { all, anyOf, observed, singles }: AmpliconRows,
    jaccardIndices: Partial<Record<string, number>>,
    minJaccard: number,
): AmpliconRows | undefined {
    const isSpecific = (row: CooccurrenceRow) => (jaccardIndices[row.label] ?? 0) >= minJaccard;
    const allSpecific = isSpecific(all);
    const specificAnyOf = anyOf.flatMap(({ row, clusters }) => {
        if (allSpecific) {
            return [{ row, clusters }];
        }
        const specificClusters = clusters.filter(isSpecific);
        return isSpecific(row) || specificClusters.length > 0 ? [{ row, clusters: specificClusters }] : [];
    });
    const specificObserved = observed.filter(isSpecific);
    return allSpecific || specificAnyOf.length > 0 || specificObserved.length > 0
        ? { all, anyOf: specificAnyOf, observed: specificObserved, singles }
        : undefined;
}
