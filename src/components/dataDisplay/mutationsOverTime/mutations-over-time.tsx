import { type Dispatch, type FC, type SetStateAction, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import z from 'zod';

import { type MutationOverTimeDataMap } from './MutationOverTimeData';
import { displayMutationsSchema, getFilteredMutationCodes } from './getFilteredMutationCodes';
import { MutationsOverTimeGridTooltip } from './mutations-over-time-grid-tooltip';
import { useSiloSchema } from '../../../dataLayer/hooks/connection';
import {
    genesOf,
    useMutationsOverTimePage,
    useOverTimeMetadata,
    type OverTimeMetadata,
} from '../../../dataLayer/hooks/mutationsOverTime';
import { siloReadFilterSchema } from '../../../dataLayer/queries/filter';
import { getProportion, type ProportionValue } from '../../../query/queryMutationsOverTime';
import { sequenceTypeSchema, temporalGranularitySchema } from '../../../types/dashboardComponents';
import { type Deletion, type Substitution } from '../../../util/mutations';
import { type Temporal, toTemporalClass } from '../../../util/temporalClass';
import { useDispatchFinishedLoadingEvent } from '../../../util/useDispatchFinishedLoadingEvent';
import { ErrorBoundary } from '../../shared/error-boundary';
import { LoadingDisplay } from '../../shared/loading-display';
import { NoDataDisplay } from '../../shared/no-data-display';
import { ResizeContainer } from '../../shared/resize-container';
import { AnnotatedMutation } from '../annotated-mutation';
import { DEFAULT_BAND_VIEW_SETTINGS } from '../band-view-settings';
import { CsvDownloadButton } from '../csv-download-button';
import { FeatureBands, type FeatureRenderer } from '../feature-bands';
import { pageSizesSchema } from '../tanstackTable/pagination';
import { PageSizeContextProvider, usePageSizeContext } from '../tanstackTable/pagination-context';
import { ViewSettingsDropdown } from '../view-settings-dropdown';

const meanProportionIntervalSchema = z.object({
    min: z.number().min(0).max(1),
    max: z.number().min(0).max(1),
    minExclusive: z.boolean().optional(),
    maxExclusive: z.boolean().optional(),
});
export type MeanProportionInterval = z.infer<typeof meanProportionIntervalSchema>;

const mutationOverTimeSchema = z.object({
    filter: siloReadFilterSchema,
    sequenceType: sequenceTypeSchema,
    granularity: temporalGranularitySchema,
    displayMutations: displayMutationsSchema.optional(),
    /** Only mutations whose mean proportion over the time range lies within this interval are shown. */
    meanProportionInterval: meanProportionIntervalSchema,
    hideGaps: z.boolean().optional(),
    width: z.string(),
    height: z.string().optional(),
    pageSizes: pageSizesSchema,
    /** The Jaccard index of each mutation, by mutation code. Shown as a column if given. */
    jaccardIndices: z.record(z.string(), z.number()).optional(),
});
export type MutationsOverTimeProps = z.infer<typeof mutationOverTimeSchema>;

export const MutationsOverTime: FC<MutationsOverTimeProps> = (componentProps) => {
    const { width, height } = componentProps;
    const size = { height, width };

    return (
        <ErrorBoundary size={size} schema={mutationOverTimeSchema} componentProps={componentProps}>
            <ResizeContainer size={size}>
                <MutationsOverTimeInner {...componentProps} />
            </ResizeContainer>
        </ErrorBoundary>
    );
};

export const MutationsOverTimeInner: FC<MutationsOverTimeProps> = ({ ...componentProps }) => {
    const { filter, sequenceType, granularity, displayMutations, pageSizes } = componentProps;
    const sequenceNames = useMemo(() => genesOf(displayMutations, sequenceType), [displayMutations, sequenceType]);

    const {
        data: metadata,
        error: metadataError,
        isPending: metadataLoading,
    } = useOverTimeMetadata(filter, granularity, sequenceType, sequenceNames, displayMutations);

    const [pageIndex, setPageIndex] = useState(0);
    useEffect(() => setPageIndex(0), [filter, granularity, sequenceType, displayMutations]);

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
        <PageSizeContextProvider pageSizes={pageSizes}>
            <MutationsOverTimeWithMetadata
                metadata={metadata}
                originalComponentProps={componentProps}
                pageIndex={pageIndex}
                setPageIndex={setPageIndex}
            />
        </PageSizeContextProvider>
    );
};

type MutationsOverTimeWithMetadataProps = {
    metadata: OverTimeMetadata;
    originalComponentProps: MutationsOverTimeProps;
    pageIndex: number;
    setPageIndex: Dispatch<SetStateAction<number>>;
};

const MutationsOverTimeWithMetadata: FC<MutationsOverTimeWithMetadataProps> = ({
    metadata,
    originalComponentProps,
    pageIndex,
    setPageIndex,
}) => {
    const { filter, sequenceType, granularity } = originalComponentProps;
    const { overallMutations, requestedDateRanges, totalCountsByBucket } = metadata;
    const { nucleotideSequence } = useSiloSchema();
    const { pageSize } = usePageSizeContext();

    const wrapperRef = useDispatchFinishedLoadingEvent();
    const [tooltipPortalTarget, setTooltipPortalTarget] = useState<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        setTooltipPortalTarget(wrapperRef.current);
    }, [wrapperRef]);

    const proportionInterval = originalComponentProps.meanProportionInterval;
    const [viewSettings, setViewSettings] = useState(DEFAULT_BAND_VIEW_SETTINGS);

    const hideGaps = originalComponentProps.hideGaps ?? false;

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

    useEffect(() => {
        setPageIndex(0);
    }, [filteredMutationCodes, setPageIndex]);

    const totalFilteredRows = filteredMutationCodes.length;
    const pageMutationCodes = useMemo(
        () => filteredMutationCodes.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
        [filteredMutationCodes, pageIndex, pageSize],
    );

    const { data: pageData, isLoading: isPageLoading } = useMutationsOverTimePage(
        filter,
        granularity,
        sequenceType,
        nucleotideSequence,
        requestedDateRanges,
        totalCountsByBucket,
        pageMutationCodes,
        hideGaps,
    );

    const mutationRenderer: FeatureRenderer<Substitution | Deletion> = useMemo(
        () => ({
            asString: (value: Substitution | Deletion) => value.code,
            renderRowLabel: (value: Substitution | Deletion) => (
                <div className={'text-center'}>
                    <AnnotatedMutation mutation={value} sequenceType={originalComponentProps.sequenceType} />
                </div>
            ),
            renderTooltip: (value: Substitution | Deletion, temporal: Temporal, proportionValue: ProportionValue) => (
                <MutationsOverTimeGridTooltip mutation={value} date={temporal} value={proportionValue} />
            ),
        }),
        [originalComponentProps.sequenceType],
    );

    // `getData` is typed to return a Promise so callers can fetch on demand; this data is
    // already in memory, so the wrapper has nothing to await.
    // eslint-disable-next-line @typescript-eslint/require-await
    const getDownloadDataAsync = async (): Promise<Record<string, string | number>[]> =>
        pageData === null ? [] : getDownloadData(pageData);

    const paginationEnd = (
        <div className='flex items-center gap-1'>
            <ViewSettingsDropdown settings={viewSettings} onChange={setViewSettings} />
            <CsvDownloadButton
                className='btn btn-xs'
                label='Download CSV'
                getData={getDownloadDataAsync}
                filename='mutations_over_time.csv'
            />
        </div>
    );

    return (
        <div ref={wrapperRef} className='border border-stone-300 bg-white p-2'>
            <FeatureBands
                rowLabelHeader='Mutation'
                data={pageData}
                isLoading={isPageLoading}
                loadingRowLabels={pageMutationCodes}
                requestedDateRanges={requestedDateRanges}
                viewSettings={viewSettings}
                featureRenderer={mutationRenderer}
                tooltipPortalTarget={tooltipPortalTarget}
                pageSizes={originalComponentProps.pageSizes}
                pageIndex={pageIndex}
                totalRows={totalFilteredRows}
                onPageChange={setPageIndex}
                paginationEnd={paginationEnd}
                meanProportions={meanProportions}
                jaccardIndices={originalComponentProps.jaccardIndices}
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
