import {
    type Dispatch,
    type FC,
    type SetStateAction,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import z from 'zod';

import { type MutationOverTimeDataMap } from './MutationOverTimeData';
import { displayMutationsSchema, getFilteredMutationCodes } from './getFilteredMutationCodes';
import { MutationBands } from './mutation-bands';
import { MutationsOverTimeGridTooltip } from './mutations-over-time-grid-tooltip';
import { useConnection, useSiloSchema } from '../../dataLayer/hooks/connection';
import {
    genesOf,
    useMutationsOverTimePage,
    useOverTimeMetadata,
    type OverTimeMetadata,
} from '../../dataLayer/hooks/mutationsOverTime';
import { siloReadFilterSchema } from '../../dataLayer/queries/filter';
import { getProportion, type ProportionValue } from '../../query/queryMutationsOverTime';
import { sequenceTypeSchema, temporalGranularitySchema, views } from '../../types/dashboardComponents';
import { type Deletion, type Substitution } from '../../util/mutations';
import { type Temporal, toTemporalClass } from '../../util/temporalClass';
import { useDispatchFinishedLoadingEvent } from '../../util/useDispatchFinishedLoadingEvent';
import { AnnotatedMutation } from '../shared/annotated-mutation';
import { type ColorScale } from '../shared/color-scale-selector';
import { CsvDownloadButton } from '../shared/csv-download-button';
import { ErrorBoundary } from '../shared/error-boundary';
import {
    customColumnSchema,
    type FeatureRenderer,
    FeaturesOverTimeGridServerPaginated,
} from '../shared/features-over-time-grid';
import { Fullscreen } from '../shared/fullscreen';
import { FullscreenTargetContext } from '../shared/fullscreen-target';
import { HideGapsButton } from '../shared/hide-gaps-button';
import Info, { InfoComponentCode, InfoHeadline1, InfoParagraph } from '../shared/info';
import { LoadingDisplay } from '../shared/loading-display';
import { type DisplayedMutationType, MutationTypeSelector } from '../shared/mutation-type-selector';
import { NoDataDisplay } from '../shared/no-data-display';
import { ResizeContainer } from '../shared/resize-container';
import Tabs from '../shared/tabs';
import { pageSizesSchema } from '../shared/tanstackTable/pagination';
import { PageSizeContextProvider, usePageSizeContext } from '../shared/tanstackTable/pagination-context';
import { ViewSettingsDropdown } from '../shared/view-settings-dropdown';

const mutationsOverTimeViewSchema = z.literal(views.grid);
export type MutationsOverTimeView = z.infer<typeof mutationsOverTimeViewSchema>;

const meanProportionIntervalSchema = z.object({
    min: z.number().min(0).max(1),
    max: z.number().min(0).max(1),
});
export type MeanProportionInterval = z.infer<typeof meanProportionIntervalSchema>;

const mutationOverTimeSchema = z.object({
    filter: siloReadFilterSchema,
    sequenceType: sequenceTypeSchema,
    views: z.array(mutationsOverTimeViewSchema),
    granularity: temporalGranularitySchema,
    displayMutations: displayMutationsSchema.optional(),
    /** Only mutations whose mean proportion over the time range lies within this interval are shown. */
    meanProportionInterval: meanProportionIntervalSchema,
    hideGaps: z.boolean().optional(),
    width: z.string(),
    height: z.string().optional(),
    pageSizes: pageSizesSchema,
    customColumns: z.array(customColumnSchema).optional(),
});
export type MutationsOverTimeProps = z.infer<typeof mutationOverTimeSchema>;

export const MutationsOverTime: FC<MutationsOverTimeProps> = (componentProps) => {
    const { width, height } = componentProps;
    const size = { height, width };
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <ErrorBoundary size={size} schema={mutationOverTimeSchema} componentProps={componentProps}>
            <FullscreenTargetContext.Provider value={containerRef}>
                <ResizeContainer size={size} ref={containerRef}>
                    <MutationsOverTimeInner {...componentProps} />
                </ResizeContainer>
            </FullscreenTargetContext.Provider>
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
            <MutationsOverTimeTabs
                metadata={metadata}
                originalComponentProps={componentProps}
                pageIndex={pageIndex}
                setPageIndex={setPageIndex}
            />
        </PageSizeContextProvider>
    );
};

type MutationOverTimeTabsProps = {
    metadata: OverTimeMetadata;
    originalComponentProps: MutationsOverTimeProps;
    pageIndex: number;
    setPageIndex: Dispatch<SetStateAction<number>>;
};

const MutationsOverTimeTabs: FC<MutationOverTimeTabsProps> = ({
    metadata,
    originalComponentProps,
    pageIndex,
    setPageIndex,
}) => {
    const { filter, sequenceType, granularity } = originalComponentProps;
    const { overallMutations, requestedDateRanges, totalCountsByBucket } = metadata;
    const { nucleotideSequence } = useSiloSchema();
    const { pageSize } = usePageSizeContext();

    const tabsRef = useDispatchFinishedLoadingEvent();
    const tooltipPortalTargetRef = useRef<HTMLDivElement>(null);
    const [tooltipPortalTarget, setTooltipPortalTarget] = useState<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        setTooltipPortalTarget(tooltipPortalTargetRef.current);
    }, []);

    const proportionInterval = originalComponentProps.meanProportionInterval;
    const [colorScale, setColorScale] = useState<ColorScale>({ min: 0, max: 1, color: 'indigo' });

    const [displayedMutationTypes, setDisplayedMutationTypes] = useState<DisplayedMutationType[]>([
        { label: 'Substitutions', checked: true, type: 'substitution' },
        { label: 'Deletions', checked: true, type: 'deletion' },
    ]);

    const [hideGaps, setHideGaps] = useState<boolean>(originalComponentProps.hideGaps ?? false);
    useEffect(() => setHideGaps(originalComponentProps.hideGaps ?? false), [originalComponentProps.hideGaps]);

    const filteredMutationCodes = useMemo(
        () =>
            getFilteredMutationCodes({
                overallMutationData: overallMutations,
                displayedMutationTypes,
                proportionInterval,
            }),
        [overallMutations, displayedMutationTypes, proportionInterval],
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
            <ViewSettingsDropdown colorScale={colorScale} setColorScale={setColorScale} />
            <CsvDownloadButton
                className='btn btn-xs'
                label='Download CSV'
                getData={getDownloadDataAsync}
                filename='mutations_over_time.csv'
            />
        </div>
    );

    const getTab = (view: MutationsOverTimeView) => {
        switch (view) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- for extensibility
            case 'grid':
                return {
                    title: 'Grid',
                    content: (
                        <FeaturesOverTimeGridServerPaginated
                            rowLabelHeader='Mutation'
                            data={pageData}
                            isLoading={isPageLoading}
                            loadingRowLabels={pageMutationCodes}
                            requestedDateRanges={requestedDateRanges}
                            colorScale={colorScale}
                            pageSizes={originalComponentProps.pageSizes}
                            pageIndex={pageIndex}
                            totalRows={totalFilteredRows}
                            onPageChange={setPageIndex}
                            customColumns={originalComponentProps.customColumns}
                            featureRenderer={mutationRenderer}
                            tooltipPortalTarget={tooltipPortalTarget}
                            paginationEnd={paginationEnd}
                        />
                    ),
                };
        }
    };

    const tabs = [
        ...originalComponentProps.views.map((view) => getTab(view)),
        // Prototype tab, not wired into `views`/the component's props schema: see
        // planning notes on this spike before promoting it past a design spike.
        {
            title: 'Bands (spike)',
            content: (
                <MutationBands
                    rowLabelHeader='Mutation'
                    data={pageData}
                    isLoading={isPageLoading}
                    loadingRowLabels={pageMutationCodes}
                    requestedDateRanges={requestedDateRanges}
                    colorScale={colorScale}
                    featureRenderer={mutationRenderer}
                    tooltipPortalTarget={tooltipPortalTarget}
                    pageSizes={originalComponentProps.pageSizes}
                    pageIndex={pageIndex}
                    totalRows={totalFilteredRows}
                    onPageChange={setPageIndex}
                    paginationEnd={paginationEnd}
                />
            ),
        },
    ];

    const toolbar = (
        <Toolbar
            displayedMutationTypes={displayedMutationTypes}
            setDisplayedMutationTypes={setDisplayedMutationTypes}
            hideGaps={hideGaps}
            setHideGaps={setHideGaps}
            originalComponentProps={originalComponentProps}
        />
    );

    return (
        <div ref={tooltipPortalTargetRef}>
            <Tabs ref={tabsRef} tabs={tabs} toolbar={toolbar} />
        </div>
    );
};

type ToolbarProps = {
    displayedMutationTypes: DisplayedMutationType[];
    setDisplayedMutationTypes: (types: DisplayedMutationType[]) => void;
    hideGaps: boolean;
    setHideGaps: Dispatch<SetStateAction<boolean>>;
    originalComponentProps: MutationsOverTimeProps;
};

const Toolbar: FC<ToolbarProps> = ({
    displayedMutationTypes,
    setDisplayedMutationTypes,
    hideGaps,
    setHideGaps,
    originalComponentProps,
}) => {
    return (
        <>
            <MutationTypeSelector
                setDisplayedMutationTypes={setDisplayedMutationTypes}
                displayedMutationTypes={displayedMutationTypes}
            />
            <HideGapsButton hideGaps={hideGaps} setHideGaps={setHideGaps} />
            <MutationsOverTimeInfo originalComponentProps={originalComponentProps} />
            <Fullscreen />
        </>
    );
};

type MutationsOverTimeInfoProps = {
    originalComponentProps: MutationsOverTimeProps;
};

const MutationsOverTimeInfo: FC<MutationsOverTimeInfoProps> = ({ originalComponentProps }) => {
    const connection = useConnection();
    return (
        <Info>
            <InfoHeadline1>Mutations over time</InfoHeadline1>
            <InfoParagraph>
                This presents the proportions of {originalComponentProps.sequenceType} mutations per{' '}
                {originalComponentProps.granularity}. In the toolbar, you can configure which mutations are displayed by
                selecting the mutation type (substitution or deletion) and applying a filter based on the proportion of
                the mutation's occurrence over the entire time range.
            </InfoParagraph>
            <InfoParagraph>
                The grid cells have a tooltip that will show more detailed information. It shows the count of samples
                that have the mutation and the count of samples with coverage (i.e. a non-ambiguous read) in this
                timeframe. Ambiguous reads are excluded when calculating the proportion. It also shows the total count
                of samples in this timeframe.
            </InfoParagraph>
            <InfoComponentCode
                componentName='mutations-over-time'
                params={originalComponentProps}
                lapisUrl={connection.url}
            />
        </Info>
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
