import { type FC, useEffect, useMemo } from 'react';

import { getFilteredMutationCodes, type ProportionInterval } from './getFilteredMutationCodes';
import { useSiloSchema } from '../../../dataLayer/hooks/connection';
import {
    genesOf,
    useMutationsOverTimePage,
    useOverTimeMetadata,
    type OverTimeMetadata,
} from '../../../dataLayer/hooks/mutationsOverTime';
import { type SiloReadFilter } from '../../../dataLayer/queries/filter';
import { type SequenceType, type TemporalGranularity } from '../../../types/dashboardComponents';
import { type Deletion, type Substitution } from '../../../util/mutations';
import { ErrorBoundary } from '../../shared/error-boundary';
import { LoadingDisplay } from '../../shared/loading-display';
import { NoDataDisplay } from '../../shared/no-data-display';
import { AnnotatedMutation } from '../annotated-mutation';
import { useBandViewSettings } from '../band-view-settings';
import { type FeatureRenderer } from '../feature-bands';
import { DEFAULT_FEATURE_SORT, JACCARD_FEATURE_SORT, sortRowLabels } from '../featureSort';
import { OverTimeGrid, proportionsByDate, useOverTimeGridState, type OverTimeGridState } from '../over-time-grid';

export type MutationsOverTimeProps = {
    filter: SiloReadFilter;
    sequenceType: SequenceType;
    granularity: TemporalGranularity;
    displayMutations?: string[];
    /** Only mutations whose mean proportion over the time range lies within this interval are shown. */
    meanProportionInterval: ProportionInterval;
    pageSizes: number[];
    /** The Jaccard index of each mutation, by mutation code. Shown as a column if given. */
    jaccardIndices?: Record<string, number>;
    /** The numbers of the amplicons each mutation is in, by mutation code; with it, a column of them. */
    ampliconsByMutation?: Record<string, number[]>;
};

export const MutationsOverTime: FC<MutationsOverTimeProps> = (props) => {
    const { filter, sequenceType, granularity, displayMutations } = props;
    return (
        <ErrorBoundary resetKeys={[filter, sequenceType, granularity, displayMutations]}>
            <MutationsOverTimeWithoutErrors {...props} />
        </ErrorBoundary>
    );
};

const MutationsOverTimeWithoutErrors: FC<MutationsOverTimeProps> = (props) => {
    const { filter, sequenceType, granularity, displayMutations, pageSizes } = props;
    const sequenceNames = useMemo(() => genesOf(displayMutations, sequenceType), [displayMutations, sequenceType]);

    const {
        data: metadata,
        error: metadataError,
        isPending: metadataLoading,
    } = useOverTimeMetadata(filter, granularity, sequenceType, sequenceNames, displayMutations);
    const gridState = useOverTimeGridState(pageSizes);

    if (metadataLoading) {
        return <LoadingDisplay />;
    }

    if (metadataError) {
        throw metadataError;
    }

    if (metadata.overallMutations.length === 0) {
        return <NoDataDisplay />;
    }

    return <MutationsOverTimeWithMetadata metadata={metadata} props={props} gridState={gridState} />;
};

const MutationsOverTimeWithMetadata: FC<{
    metadata: OverTimeMetadata;
    props: MutationsOverTimeProps;
    gridState: OverTimeGridState;
}> = ({ metadata, props, gridState }) => {
    const { filter, sequenceType, granularity, meanProportionInterval, jaccardIndices, ampliconsByMutation } = props;
    const { overallMutations, requestedDateRanges, totalCountsByBucket } = metadata;
    const { nucleotideSequence } = useSiloSchema();
    const [viewSettings] = useBandViewSettings();

    const filteredMutationCodes = useMemo(
        () =>
            getFilteredMutationCodes({
                overallMutationData: overallMutations,
                proportionInterval: meanProportionInterval,
            }),
        [overallMutations, meanProportionInterval],
    );

    // A display mutation that the metadata query didn't return is in `overallMutations` with a
    // count and proportion of 0 (see `applyDisplayMutations`), but that isn't a measurement: it is
    // below the query's proportion floor, or no read covered it. Every mutation the query did
    // return has a count, being above the floor. The filter above still takes the 0.
    const meanProportions = useMemo(
        () =>
            Object.fromEntries(
                overallMutations
                    .filter((entry) => entry.count > 0)
                    .map((entry) => [entry.mutation.code, entry.proportion]),
            ),
        [overallMutations],
    );

    const sort = gridState.sortOr(
        jaccardIndices === undefined ? DEFAULT_FEATURE_SORT : JACCARD_FEATURE_SORT,
        jaccardIndices !== undefined,
    );
    const sortedMutationCodes = useMemo(
        () => sortRowLabels(filteredMutationCodes, sort, { meanProportions, jaccardIndices }),
        [filteredMutationCodes, sort, meanProportions, jaccardIndices],
    );

    const { setPageIndex, pageOf } = gridState;
    useEffect(() => setPageIndex(0), [filteredMutationCodes, setPageIndex]);

    const pageMutationCodes = useMemo(() => pageOf(sortedMutationCodes), [pageOf, sortedMutationCodes]);

    const { data: pageData, isLoading: isPageLoading } = useMutationsOverTimePage(
        filter,
        granularity,
        sequenceType,
        nucleotideSequence,
        requestedDateRanges,
        totalCountsByBucket,
        pageMutationCodes,
        viewSettings.showEmptyDates,
    );

    const mutationRenderer: FeatureRenderer<Substitution | Deletion> = useMemo(
        () => ({
            asString: (value: Substitution | Deletion) => value.code,
            renderRowLabel: (value: Substitution | Deletion) => (
                <div className={'text-center'}>
                    <AnnotatedMutation mutation={value} sequenceType={sequenceType} />
                </div>
            ),
            describe: (mutation, value) =>
                value.type === 'noCoverage' ? (
                    <p className='text-gray-600'>No reads cover position {mutation.position}.</p>
                ) : (
                    <>
                        <p>
                            {value.count}{' '}
                            <span className='text-gray-600'>have the mutation {mutation.code} out of</span>
                        </p>
                        <p>
                            {value.coverage}{' '}
                            <span className='text-gray-600'>with coverage at position {mutation.position}.</span>
                        </p>
                    </>
                ),
        }),
        [sequenceType],
    );

    return (
        <OverTimeGrid
            state={gridState}
            rowLabelHeader='Mutation'
            data={pageData}
            isLoading={isPageLoading}
            loadingRowLabels={pageMutationCodes}
            requestedDateRanges={requestedDateRanges}
            featureRenderer={mutationRenderer}
            totalRows={sortedMutationCodes.length}
            csv={{
                filename: 'mutations_over_time.csv',
                getRows: () =>
                    pageData === null
                        ? []
                        : pageData
                              .getFirstAxisKeys()
                              .map((mutation) => ({
                                  mutation: mutation.code,
                                  ...proportionsByDate(pageData, mutation),
                              })),
            }}
            meanProportions={meanProportions}
            jaccardIndices={jaccardIndices}
            extraColumn={
                ampliconsByMutation === undefined
                    ? undefined
                    : {
                          header: 'Amplicon',
                          render: (code) => (ampliconsByMutation[code] as number[] | undefined)?.join(', ') ?? '–',
                      }
            }
            sort={sort}
        />
    );
};
