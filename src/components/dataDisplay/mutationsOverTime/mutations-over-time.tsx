import { type Dispatch, type FC, type SetStateAction, useEffect, useMemo, useState } from 'react';

import { type MutationOverTimeDataMap } from './MutationOverTimeData';
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
import { toTemporalClass } from '../../../util/temporalClass';
import { ErrorBoundary } from '../../shared/error-boundary';
import { LoadingDisplay } from '../../shared/loading-display';
import { NoDataDisplay } from '../../shared/no-data-display';
import { AnnotatedMutation } from '../annotated-mutation';
import { useBandViewSettings } from '../band-view-settings';
import { CsvDownloadButton } from '../csv-download-button';
import { FeatureBands, type FeatureRenderer } from '../feature-bands';
import { DEFAULT_FEATURE_SORT, JACCARD_FEATURE_SORT, sortRowLabels, type FeatureSort } from '../featureSort';
import { getProportion } from '../overTime/proportionValue';
import { ViewSettingsControls } from '../view-settings-controls';

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

const MutationsOverTimeWithoutErrors: FC<MutationsOverTimeProps> = ({ ...componentProps }) => {
    const { filter, sequenceType, granularity, displayMutations, pageSizes } = componentProps;
    const sequenceNames = useMemo(() => genesOf(displayMutations, sequenceType), [displayMutations, sequenceType]);

    const {
        data: metadata,
        error: metadataError,
        isPending: metadataLoading,
    } = useOverTimeMetadata(filter, granularity, sequenceType, sequenceNames, displayMutations);

    const [pageIndex, setPageIndex] = useState(0);
    useEffect(() => setPageIndex(0), [filter, granularity, sequenceType, displayMutations]);
    // Up here rather than next to the rows, so it survives the reloading when the filters change.
    // `undefined` until a header is clicked: the default depends on whether there are Jaccard indices.
    const [sort, setSort] = useState<FeatureSort | undefined>(undefined);
    const [pageSize, setPageSize] = useState(pageSizes[0]);

    if (metadataLoading) {
        return <LoadingDisplay />;
    }

    if (metadataError) {
        throw metadataError;
    }

    if (metadata.overallMutations.length === 0) {
        return <NoDataDisplay />;
    }

    return (
        <MutationsOverTimeWithMetadata
            metadata={metadata}
            originalComponentProps={componentProps}
            pageIndex={pageIndex}
            setPageIndex={setPageIndex}
            pageSize={pageSize}
            setPageSize={setPageSize}
            sort={sort}
            setSort={setSort}
        />
    );
};

type MutationsOverTimeWithMetadataProps = {
    metadata: OverTimeMetadata;
    originalComponentProps: MutationsOverTimeProps;
    pageIndex: number;
    setPageIndex: Dispatch<SetStateAction<number>>;
    pageSize: number;
    setPageSize: (pageSize: number) => void;
    sort: FeatureSort | undefined;
    setSort: (sort: FeatureSort) => void;
};

const MutationsOverTimeWithMetadata: FC<MutationsOverTimeWithMetadataProps> = ({
    metadata,
    originalComponentProps,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    sort,
    setSort,
}) => {
    const { filter, sequenceType, granularity, jaccardIndices, ampliconsByMutation } = originalComponentProps;
    const { overallMutations, requestedDateRanges, totalCountsByBucket } = metadata;
    const { nucleotideSequence } = useSiloSchema();

    const proportionInterval = originalComponentProps.meanProportionInterval;
    const [viewSettings, setViewSettings] = useBandViewSettings();

    const filteredMutationCodes = useMemo(
        () =>
            getFilteredMutationCodes({
                overallMutationData: overallMutations,
                proportionInterval,
            }),
        [overallMutations, proportionInterval],
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

    // A sort by a Jaccard index that the mutations no longer have (e.g. another mode) falls back.
    const defaultSort = jaccardIndices === undefined ? DEFAULT_FEATURE_SORT : JACCARD_FEATURE_SORT;
    const effectiveSort =
        sort === undefined || (sort.column === 'jaccardIndex' && jaccardIndices === undefined) ? defaultSort : sort;
    const sortedMutationCodes = useMemo(
        () => sortRowLabels(filteredMutationCodes, effectiveSort, { meanProportions, jaccardIndices }),
        [filteredMutationCodes, effectiveSort, meanProportions, jaccardIndices],
    );

    useEffect(() => {
        setPageIndex(0);
    }, [filteredMutationCodes, setPageIndex]);

    // Back to the first page in the same render as the new order, so the queries of whatever
    // page was open are never sent for the reordered rows.
    const changeSort = (newSort: FeatureSort) => {
        setSort(newSort);
        setPageIndex(0);
    };

    const changePageSize = (newPageSize: number) => {
        setPageSize(newPageSize);
        setPageIndex(0);
    };

    const totalFilteredRows = sortedMutationCodes.length;
    const pageMutationCodes = useMemo(
        () => sortedMutationCodes.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
        [sortedMutationCodes, pageIndex, pageSize],
    );

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
                    <AnnotatedMutation mutation={value} sequenceType={originalComponentProps.sequenceType} />
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
        [originalComponentProps.sequenceType],
    );

    // `getData` is typed to return a Promise so callers can fetch on demand; this data is
    // already in memory, so the wrapper has nothing to await.
    // eslint-disable-next-line @typescript-eslint/require-await
    const getDownloadDataAsync = async (): Promise<Record<string, string | number>[]> =>
        pageData === null ? [] : getDownloadData(pageData);

    const paginationStart = <ViewSettingsControls settings={viewSettings} onChange={setViewSettings} />;

    const paginationEnd = (
        <div className='flex items-center gap-1'>
            <CsvDownloadButton
                className='btn btn-xs'
                label='Download CSV'
                getData={getDownloadDataAsync}
                filename='mutations_over_time.csv'
            />
        </div>
    );

    return (
        <div className='border border-stone-300 bg-white'>
            <FeatureBands
                rowLabelHeader='Mutation'
                data={pageData}
                isLoading={isPageLoading}
                loadingRowLabels={pageMutationCodes}
                requestedDateRanges={requestedDateRanges}
                viewSettings={viewSettings}
                featureRenderer={mutationRenderer}
                pagination={{
                    pageIndex,
                    pageSize,
                    pageSizes: originalComponentProps.pageSizes,
                    totalRows: totalFilteredRows,
                    onPageChange: setPageIndex,
                    onPageSizeChange: changePageSize,
                    startContent: paginationStart,
                    endContent: paginationEnd,
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
                sort={effectiveSort}
                onSortChange={changeSort}
            />
        </div>
    );
};

function getDownloadData(filteredData: MutationOverTimeDataMap) {
    const dates = filteredData.getSecondAxisKeys().map((date) => toTemporalClass(date));

    return filteredData.getFirstAxisKeys().map((mutation) => {
        return dates.reduce(
            (accumulated, date) => {
                const value = filteredData.get(mutation, date);
                const proportion = getProportion(value ?? null) ?? '';
                return {
                    ...accumulated,
                    [date.dateString]: proportion,
                };
            },
            { mutation: mutation.code },
        );
    });
}
