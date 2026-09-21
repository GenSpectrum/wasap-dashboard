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

import { getFilteredQueryOverTimeData, type QueryFilter } from './getFilteredQueriesOverTimeData';
import { QueriesOverTimeFilter } from './queries-over-time-filter';
import { QueriesOverTimeGridTooltip } from './queries-over-time-grid-tooltip';
import { QueriesOverTimeRowLabelTooltip } from './queries-over-time-row-label-tooltip';
import { useConnection } from '../../dataLayer/hooks/connection';
import { useQueriesOverTime } from '../../dataLayer/hooks/queriesOverTime';
import { siloFilterExpressionSchema, siloReadFilterSchema } from '../../dataLayer/queries';
import { type ProportionValue, getProportion } from '../../query/queryMutationsOverTime';
import { temporalGranularitySchema, views } from '../../types/dashboardComponents';
import { type Map2DContents } from '../../util/map2d';
import { type Temporal, toTemporalClass } from '../../util/temporalClass';
import { useDispatchFinishedLoadingEvent } from '../../util/useDispatchFinishedLoadingEvent';
import { type ColorScale } from '../shared/color-scale-selector';
import { CsvDownloadButton } from '../shared/csv-download-button';
import { ErrorBoundary } from '../shared/error-boundary';
import FeaturesOverTimeGrid, { type FeatureRenderer, customColumnSchema } from '../shared/features-over-time-grid';
import { Fullscreen } from '../shared/fullscreen';
import { FullscreenTargetContext } from '../shared/fullscreen-target';
import { HideGapsButton } from '../shared/hide-gaps-button';
import Info, { InfoComponentCode, InfoHeadline1, InfoParagraph } from '../shared/info';
import { LoadingDisplay } from '../shared/loading-display';
import { NoDataDisplay } from '../shared/no-data-display';
import PortalTooltip from '../shared/portal-tooltip';
import { ResizeContainer } from '../shared/resize-container';
import Tabs from '../shared/tabs';
import { pageSizesSchema } from '../shared/tanstackTable/pagination';
import { PageSizeContextProvider } from '../shared/tanstackTable/pagination-context';
import { ViewSettingsDropdown } from '../shared/view-settings-dropdown';

const queriesOverTimeViewSchema = z.literal(views.grid);
export type QueriesOverTimeView = z.infer<typeof queriesOverTimeViewSchema>;

const meanProportionIntervalSchema = z.object({
    min: z.number().min(0).max(1),
    max: z.number().min(0).max(1),
});
export type MeanProportionInterval = z.infer<typeof meanProportionIntervalSchema>;

const queriesOverTimeQuerySchema = z.object({
    displayLabel: z.string(),
    description: z.string().optional(),
    /** The advanced-query string, kept for display in the row-label tooltip. */
    query: z.string(),
    /** The parsed, genome-only expression that SILO is asked (see `data/queriesOverTime.ts`). */
    filter: siloFilterExpressionSchema,
});
export type QueriesOverTimeQuery = z.infer<typeof queriesOverTimeQuerySchema>;

const queriesOverTimeSchema = z.object({
    filter: siloReadFilterSchema,
    queries: z
        .array(queriesOverTimeQuerySchema)
        .min(1)
        .superRefine((queries, ctx) => {
            const duplicateDisplayLabels = findDuplicateStrings(queries.map((v) => v.displayLabel));
            if (duplicateDisplayLabels.length > 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Display labels must be unique. Duplicates: ${duplicateDisplayLabels.join(', ')}`,
                });
            }
        }),
    views: z.array(queriesOverTimeViewSchema),
    granularity: temporalGranularitySchema,
    /** Only queries whose mean proportion over the time range lies within this interval are shown. */
    meanProportionInterval: meanProportionIntervalSchema,
    hideGaps: z.boolean().optional(),
    width: z.string(),
    height: z.string().optional(),
    pageSizes: pageSizesSchema,
    customColumns: z.array(customColumnSchema).optional(),
});
export type QueriesOverTimeProps = z.infer<typeof queriesOverTimeSchema>;

export const QueriesOverTime: FC<QueriesOverTimeProps> = (componentProps) => {
    const { width, height } = componentProps;
    const size = { height, width };
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <ErrorBoundary size={size} schema={queriesOverTimeSchema} componentProps={componentProps}>
            <FullscreenTargetContext.Provider value={containerRef}>
                <ResizeContainer size={size} ref={containerRef}>
                    <QueriesOverTimeInner {...componentProps} />
                </ResizeContainer>
            </FullscreenTargetContext.Provider>
        </ErrorBoundary>
    );
};

export const QueriesOverTimeInner: FC<QueriesOverTimeProps> = ({ ...componentProps }) => {
    const { filter, queries, granularity } = componentProps;

    const { data: queryOverTimeData, isLoading } = useQueriesOverTime(filter, granularity, queries);

    if (isLoading) {
        return <LoadingDisplay />;
    }

    if (queryOverTimeData === null || queryOverTimeData.keysFirstAxis.size === 0) {
        return <NoDataDisplay />;
    }

    return <QueriesOverTimeTabs queryOverTimeData={queryOverTimeData} originalComponentProps={componentProps} />;
};

type QueriesOverTimeTabsProps = {
    queryOverTimeData: Map2DContents<string, Temporal, ProportionValue>;
    originalComponentProps: QueriesOverTimeProps;
};

const QueriesOverTimeTabs: FC<QueriesOverTimeTabsProps> = ({ queryOverTimeData, originalComponentProps }) => {
    const tabsRef = useDispatchFinishedLoadingEvent();
    const tooltipPortalTargetRef = useRef<HTMLDivElement>(null);
    const [tooltipPortalTarget, setTooltipPortalTarget] = useState<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        setTooltipPortalTarget(tooltipPortalTargetRef.current);
    }, []);

    const [queryFilterValue, setQueryFilterValue] = useState<QueryFilter>({
        textFilter: '',
    });

    const proportionInterval = originalComponentProps.meanProportionInterval;
    const [colorScale, setColorScale] = useState<ColorScale>({ min: 0, max: 1, color: 'indigo' });
    const [hideGaps, setHideGaps] = useState<boolean>(originalComponentProps.hideGaps ?? false);

    useEffect(() => setHideGaps(originalComponentProps.hideGaps ?? false), [originalComponentProps.hideGaps]);

    const filteredData = useMemo(() => {
        return getFilteredQueryOverTimeData({
            data: queryOverTimeData,
            proportionInterval,
            hideGaps,
            queryFilterValue,
        });
    }, [queryOverTimeData, proportionInterval, hideGaps, queryFilterValue]);

    const queryLookupMap = useMemo(
        () => new Map(originalComponentProps.queries.map((query) => [query.displayLabel, query])),
        [originalComponentProps.queries],
    );

    const queryRenderer = useMemo<FeatureRenderer<string>>(
        () => ({
            asString: (value: string) => value,
            renderRowLabel: (value: string) => {
                const queryObject = queryLookupMap.get(value);

                return (
                    <PortalTooltip
                        content={
                            <QueriesOverTimeRowLabelTooltip
                                query={queryObject ?? { displayLabel: value, description: undefined, query: '' }}
                            />
                        }
                        position='right'
                        portalTarget={tooltipPortalTarget}
                    >
                        <div className='mr-2 text-center whitespace-nowrap'>
                            <span>{value}</span>
                        </div>
                    </PortalTooltip>
                );
            },
            renderTooltip: (value: string, temporal: Temporal, proportionValue: ProportionValue) => (
                <QueriesOverTimeGridTooltip query={value} date={temporal} value={proportionValue} />
            ),
        }),
        [tooltipPortalTarget, queryLookupMap],
    );

    const paginationEnd = (
        <div className='flex items-center gap-1'>
            <ViewSettingsDropdown colorScale={colorScale} setColorScale={setColorScale} />
            <CsvDownloadButton
                className='btn btn-xs'
                label='Download CSV'
                getData={() => getDownloadData(filteredData)}
                filename='queries_over_time.csv'
            />
        </div>
    );

    const getTab = (view: QueriesOverTimeView) => {
        switch (view) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- for extensibility
            case 'grid':
                return {
                    title: 'Grid',
                    content: (
                        <FeaturesOverTimeGrid
                            rowLabelHeader='Query'
                            data={filteredData}
                            colorScale={colorScale}
                            pageSizes={originalComponentProps.pageSizes}
                            customColumns={originalComponentProps.customColumns}
                            featureRenderer={queryRenderer}
                            tooltipPortalTarget={tooltipPortalTarget}
                            paginationEnd={paginationEnd}
                        />
                    ),
                };
        }
    };

    const tabs = originalComponentProps.views.map((view) => getTab(view));

    const toolbar = (
        <Toolbar
            hideGaps={hideGaps}
            setHideGaps={setHideGaps}
            originalComponentProps={originalComponentProps}
            setFilterValue={setQueryFilterValue}
            queryFilterValue={queryFilterValue}
        />
    );

    return (
        <div ref={tooltipPortalTargetRef}>
            <PageSizeContextProvider pageSizes={originalComponentProps.pageSizes}>
                <Tabs ref={tabsRef} tabs={tabs} toolbar={toolbar} />
            </PageSizeContextProvider>
        </div>
    );
};

type ToolbarProps = {
    hideGaps: boolean;
    setHideGaps: Dispatch<SetStateAction<boolean>>;
    originalComponentProps: QueriesOverTimeProps;
    queryFilterValue: QueryFilter;
    setFilterValue: Dispatch<SetStateAction<QueryFilter>>;
};

const Toolbar: FC<ToolbarProps> = ({
    hideGaps,
    setHideGaps,
    originalComponentProps,
    setFilterValue,
    queryFilterValue,
}) => {
    return (
        <>
            <QueriesOverTimeFilter setFilterValue={setFilterValue} value={queryFilterValue} />
            <HideGapsButton hideGaps={hideGaps} setHideGaps={setHideGaps} />
            <QueriesOverTimeInfo originalComponentProps={originalComponentProps} />
            <Fullscreen />
        </>
    );
};

type QueriesOverTimeInfoProps = {
    originalComponentProps: QueriesOverTimeProps;
};

const QueriesOverTimeInfo: FC<QueriesOverTimeInfoProps> = ({ originalComponentProps }) => {
    const connection = useConnection();
    return (
        <Info>
            <InfoHeadline1>Queries over time</InfoHeadline1>
            <InfoParagraph>
                This component displays the proportions of custom queries per {originalComponentProps.granularity}. Each
                query consists of a count query (what to count) and a coverage query (what to use as the denominator).
                In the toolbar, you can filter queries by text. Which queries are displayed can also be restricted
                through a filter on the mean proportion of the query's occurrence over the entire time range, which is
                set from outside this component.
            </InfoParagraph>
            <InfoParagraph>
                The grid cells have a tooltip that will show more detailed information. It shows the count of samples
                that match the count query and the count of samples that match the coverage query in this timeframe. It
                also shows the total count of samples in this timeframe.
            </InfoParagraph>
            <InfoComponentCode
                componentName='queries-over-time'
                params={originalComponentProps}
                lapisUrl={connection.url}
            />
        </Info>
    );
};

function getDownloadData(filteredData: ReturnType<typeof getFilteredQueryOverTimeData>) {
    const dates = filteredData.getSecondAxisKeys().map((date) => toTemporalClass(date));

    return filteredData.getFirstAxisKeys().map((query) => {
        return dates.reduce(
            (accumulated, date) => {
                const value = filteredData.get(query, date);
                const proportion = getProportion(value ?? null) ?? '';
                return {
                    ...accumulated,
                    [date.dateString]: proportion,
                };
            },
            { query },
        );
    });
}

function findDuplicateStrings(items: string[]): string[] {
    const counts = new Map<string, number>();

    for (const item of items) {
        counts.set(item, (counts.get(item) ?? 0) + 1);
    }

    return [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
}
