import { type FC, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import z from 'zod';

import { getFilteredQueryOverTimeData, getMeanProportions } from './getFilteredQueriesOverTimeData';
import { QueriesOverTimeGridTooltip } from './queries-over-time-grid-tooltip';
import { QueriesOverTimeRowLabelTooltip } from './queries-over-time-row-label-tooltip';
import { useQueriesOverTime } from '../../../dataLayer/hooks/queriesOverTime';
import { siloFilterExpressionSchema, siloReadFilterSchema } from '../../../dataLayer/queries';
import { temporalGranularitySchema } from '../../../types/dashboardComponents';
import { type Map2DContents, Map2dView } from '../../../util/map2d';
import { type Temporal, toTemporalClass } from '../../../util/temporalClass';
import { useDispatchFinishedLoadingEvent } from '../../../util/useDispatchFinishedLoadingEvent';
import { ErrorBoundary } from '../../shared/error-boundary';
import { LoadingDisplay } from '../../shared/loading-display';
import { NoDataDisplay } from '../../shared/no-data-display';
import { ResizeContainer } from '../../shared/resize-container';
import { DEFAULT_BAND_VIEW_SETTINGS } from '../band-view-settings';
import { CsvDownloadButton } from '../csv-download-button';
import { FeatureBands, type FeatureRenderer } from '../feature-bands';
import { DEFAULT_FEATURE_SORT, sortRowLabels, type FeatureSort } from '../featureSort';
import { type ProportionValue, getProportion } from '../overTime/proportionValue';
import PortalTooltip from '../portal-tooltip';
import { pageSizesSchema } from '../tanstackTable/pagination';
import { PageSizeContextProvider, usePageSizeContext } from '../tanstackTable/pagination-context';
import { ViewSettingsControls } from '../view-settings-controls';

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
    granularity: temporalGranularitySchema,
    /** Only queries whose mean proportion over the time range lies within this interval are shown. */
    meanProportionInterval: meanProportionIntervalSchema,
    hideGaps: z.boolean().optional(),
    width: z.string(),
    height: z.string().optional(),
    pageSizes: pageSizesSchema,
});
export type QueriesOverTimeProps = z.infer<typeof queriesOverTimeSchema>;

export const QueriesOverTime: FC<QueriesOverTimeProps> = (componentProps) => {
    const { width, height } = componentProps;
    const size = { height, width };

    return (
        <ErrorBoundary size={size} schema={queriesOverTimeSchema} componentProps={componentProps}>
            <ResizeContainer size={size}>
                <QueriesOverTimeInner {...componentProps} />
            </ResizeContainer>
        </ErrorBoundary>
    );
};

export const QueriesOverTimeInner: FC<QueriesOverTimeProps> = ({ ...componentProps }) => {
    const { filter, queries, granularity } = componentProps;

    const { data: queryOverTimeData, isLoading } = useQueriesOverTime(filter, granularity, queries);
    // Up here rather than next to the rows, so it survives the reloading when the filters change.
    const [sort, setSort] = useState(DEFAULT_FEATURE_SORT);

    if (isLoading) {
        return <LoadingDisplay />;
    }

    if (queryOverTimeData === null || queryOverTimeData.keysFirstAxis.size === 0) {
        return <NoDataDisplay />;
    }

    return (
        <PageSizeContextProvider pageSizes={componentProps.pageSizes}>
            <QueriesOverTimeWithData
                queryOverTimeData={queryOverTimeData}
                originalComponentProps={componentProps}
                sort={sort}
                setSort={setSort}
            />
        </PageSizeContextProvider>
    );
};

type QueriesOverTimeWithDataProps = {
    queryOverTimeData: Map2DContents<string, Temporal, ProportionValue>;
    originalComponentProps: QueriesOverTimeProps;
    sort: FeatureSort;
    setSort: (sort: FeatureSort) => void;
};

const QueriesOverTimeWithData: FC<QueriesOverTimeWithDataProps> = ({
    queryOverTimeData,
    originalComponentProps,
    sort,
    setSort,
}) => {
    const wrapperRef = useDispatchFinishedLoadingEvent();
    const [tooltipPortalTarget, setTooltipPortalTarget] = useState<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        setTooltipPortalTarget(wrapperRef.current);
    }, [wrapperRef]);

    const { pageSize } = usePageSizeContext();
    const [pageIndex, setPageIndex] = useState(0);

    const proportionInterval = originalComponentProps.meanProportionInterval;
    const [viewSettings, setViewSettings] = useState(DEFAULT_BAND_VIEW_SETTINGS);
    const hideGaps = originalComponentProps.hideGaps ?? false;

    const meanProportions = useMemo(() => getMeanProportions(queryOverTimeData), [queryOverTimeData]);

    const filteredData = useMemo(() => {
        return getFilteredQueryOverTimeData({
            data: queryOverTimeData,
            meanProportions,
            proportionInterval,
            hideGaps,
        });
    }, [queryOverTimeData, meanProportions, proportionInterval, hideGaps]);

    const sortedQueries = useMemo(
        () => sortRowLabels(filteredData.getFirstAxisKeys(), sort, { meanProportions }),
        [filteredData, sort, meanProportions],
    );

    useEffect(() => setPageIndex(0), [filteredData]);

    const changeSort = (newSort: FeatureSort) => {
        setSort(newSort);
        setPageIndex(0);
    };

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

    const paginationStart = <ViewSettingsControls settings={viewSettings} onChange={setViewSettings} />;

    const paginationEnd = (
        <div className='flex items-center gap-1'>
            <CsvDownloadButton
                className='btn btn-xs'
                label='Download CSV'
                getData={() => getDownloadData(filteredData)}
                filename='queries_over_time.csv'
            />
        </div>
    );

    const pageData = useMemo(() => {
        const page = new Map2dView(filteredData);
        page.selectRows(sortedQueries.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize));
        return page;
    }, [filteredData, sortedQueries, pageIndex, pageSize]);

    return (
        <div ref={wrapperRef} className='border border-stone-300 bg-white'>
            <FeatureBands
                rowLabelHeader='Query'
                data={pageData}
                isLoading={false}
                loadingRowLabels={[]}
                requestedDateRanges={filteredData.getSecondAxisKeys()}
                viewSettings={viewSettings}
                featureRenderer={queryRenderer}
                tooltipPortalTarget={tooltipPortalTarget}
                pageSizes={originalComponentProps.pageSizes}
                pageIndex={pageIndex}
                totalRows={sortedQueries.length}
                onPageChange={setPageIndex}
                paginationStart={paginationStart}
                paginationEnd={paginationEnd}
                meanProportions={meanProportions}
                sort={sort}
                onSortChange={changeSort}
            />
        </div>
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
