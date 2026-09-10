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

import { displayMutationsSchema, getFilteredMutationCodes, type MutationFilter } from './getFilteredMutationCodes';
import { MutationsOverTimeGridTooltip } from './mutations-over-time-grid-tooltip';
import { getProportion, type ProportionValue } from '../../../query/queryMutationsOverTime';
import { sequenceTypeSchema, temporalGranularitySchema, views } from '../../../types/dashboardComponents';
import { siloReadFilterSchema } from '../../../queries/filter';
import {
    genesOf,
    useMutationsOverTimePage,
    useOverTimeMetadata,
    type OverTimeMetadata,
} from '../../../data/mutationsOverTime';
import { useConnection, useSiloSchema } from '../../../data/connection';
import { type Deletion, type Substitution } from '../../../util/mutations';
import { type Temporal, toTemporalClass } from '../../../util/temporalClass';
import { useDispatchFinishedLoadingEvent } from '../../../util/useDispatchFinishedLoadingEvent';
import { useMutationAnnotationsProvider } from '../MutationAnnotationsContext';
import { type MutationOverTimeDataMap } from './MutationOverTimeData';
import { AnnotatedMutation } from '../components/annotated-mutation';
import { type ColorScale } from '../components/color-scale-selector';
import { ColorScaleSelectorDropdown } from '../components/color-scale-selector-dropdown';
import { CsvDownloadButton } from '../components/csv-download-button';
import { ErrorBoundary } from '../components/error-boundary';
import {
    customColumnSchema,
    type FeatureRenderer,
    FeaturesOverTimeGridServerPaginated,
} from '../components/features-over-time-grid';
import { Fullscreen } from '../components/fullscreen';
import { FullscreenTargetContext } from '../components/fullscreen-target';
import { HideGapsButton } from '../components/hide-gaps-button';
import Info, { InfoComponentCode, InfoHeadline1, InfoParagraph } from '../components/info';
import { LoadingDisplay } from '../components/loading-display';
import { type DisplayedMutationType, MutationTypeSelector } from '../components/mutation-type-selector';
import { MutationsOverTimeMutationsFilter } from '../components/mutations-over-time-mutations-filter';
import { NoDataDisplay } from '../components/no-data-display';
import type { ProportionInterval } from '../components/proportion-selector';
import { ProportionSelectorDropdown } from '../components/proportion-selector-dropdown';
import { ResizeContainer } from '../components/resize-container';
import { type DisplayedSegment, SegmentSelector, useDisplayedSegments } from '../components/segment-selector';
import Tabs from '../components/tabs';
import { pageSizesSchema } from '../shared/tanstackTable/pagination';
import { PageSizeContextProvider, usePageSizeContext } from '../shared/tanstackTable/pagination-context';

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
    initialMeanProportionInterval: meanProportionIntervalSchema,
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

    const [mutationFilterValue, setMutationFilterValue] = useState<MutationFilter>({
        textFilter: '',
        annotationNameFilter: new Set(),
    });
    const annotationProvider = useMutationAnnotationsProvider();

    const [proportionInterval, setProportionInterval] = useState(originalComponentProps.initialMeanProportionInterval);
    const [colorScale, setColorScale] = useState<ColorScale>({ min: 0, max: 1, color: 'indigo' });

    const [displayedSegments, setDisplayedSegments] = useDisplayedSegments(originalComponentProps.sequenceType);
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
                displayedSegments,
                displayedMutationTypes,
                proportionInterval,
                mutationFilterValue,
                sequenceType: originalComponentProps.sequenceType,
                annotationProvider,
            }),
        [
            overallMutations,
            displayedSegments,
            displayedMutationTypes,
            proportionInterval,
            originalComponentProps.sequenceType,
            mutationFilterValue,
            annotationProvider,
        ],
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
                        />
                    ),
                };
        }
    };

    const tabs = originalComponentProps.views.map((view) => getTab(view));

    const toolbar = (activeTab: string) => (
        <Toolbar
            activeTab={activeTab}
            displayedSegments={displayedSegments}
            setDisplayedSegments={setDisplayedSegments}
            displayedMutationTypes={displayedMutationTypes}
            setDisplayedMutationTypes={setDisplayedMutationTypes}
            proportionInterval={proportionInterval}
            setProportionInterval={setProportionInterval}
            hideGaps={hideGaps}
            setHideGaps={setHideGaps}
            colorScale={colorScale}
            setColorScale={setColorScale}
            originalComponentProps={originalComponentProps}
            setFilterValue={setMutationFilterValue}
            mutationFilterValue={mutationFilterValue}
            downloadData={pageData}
        />
    );

    return (
        <div ref={tooltipPortalTargetRef}>
            <Tabs ref={tabsRef} tabs={tabs} toolbar={toolbar} />
        </div>
    );
};

type ToolbarProps = {
    activeTab: string;
    displayedSegments: DisplayedSegment[];
    setDisplayedSegments: (segments: DisplayedSegment[]) => void;
    displayedMutationTypes: DisplayedMutationType[];
    setDisplayedMutationTypes: (types: DisplayedMutationType[]) => void;
    proportionInterval: ProportionInterval;
    setProportionInterval: Dispatch<SetStateAction<ProportionInterval>>;
    hideGaps: boolean;
    setHideGaps: Dispatch<SetStateAction<boolean>>;
    colorScale: ColorScale;
    setColorScale: Dispatch<SetStateAction<ColorScale>>;
    originalComponentProps: MutationsOverTimeProps;
    mutationFilterValue: MutationFilter;
    setFilterValue: Dispatch<SetStateAction<MutationFilter>>;
    /** The matrix as currently shown (this page, hide-gaps applied); `null` while loading. */
    downloadData: MutationOverTimeDataMap | null;
};

const Toolbar: FC<ToolbarProps> = ({
    activeTab,
    displayedSegments,
    setDisplayedSegments,
    displayedMutationTypes,
    setDisplayedMutationTypes,
    proportionInterval,
    setProportionInterval,
    hideGaps,
    setHideGaps,
    colorScale,
    setColorScale,
    originalComponentProps,
    setFilterValue,
    mutationFilterValue,
    downloadData,
}) => {
    const getDownloadDataAsync = async (): Promise<Record<string, string | number>[]> =>
        downloadData === null ? [] : getDownloadData(downloadData);

    return (
        <>
            <MutationsOverTimeMutationsFilter setFilterValue={setFilterValue} value={mutationFilterValue} />
            <SegmentSelector
                displayedSegments={displayedSegments}
                setDisplayedSegments={setDisplayedSegments}
                sequenceType={originalComponentProps.sequenceType}
            />
            <MutationTypeSelector
                setDisplayedMutationTypes={setDisplayedMutationTypes}
                displayedMutationTypes={displayedMutationTypes}
            />
            <ProportionSelectorDropdown
                proportionInterval={proportionInterval}
                setMinProportion={(min) => setProportionInterval((prev) => ({ ...prev, min }))}
                setMaxProportion={(max) => setProportionInterval((prev) => ({ ...prev, max }))}
                labelPrefix='Mean proportion'
            />
            <HideGapsButton hideGaps={hideGaps} setHideGaps={setHideGaps} />
            {activeTab === 'Grid' && (
                <ColorScaleSelectorDropdown colorScale={colorScale} setColorScale={setColorScale} />
            )}
            <CsvDownloadButton
                className='btn btn-xs'
                getData={getDownloadDataAsync}
                filename='mutations_over_time.csv'
            />
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
                selecting the mutation type (substitution or deletion), choosing specific segments/genes (if the
                organism has multiple segments/genes), and applying a filter based on the proportion of the mutation's
                occurrence over the entire time range.
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
