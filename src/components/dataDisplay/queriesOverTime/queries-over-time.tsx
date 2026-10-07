import { type FC, useEffect, useMemo, useState } from 'react';

import { getFilteredQueryOverTimeData, getMeanProportions } from './getFilteredQueriesOverTimeData';
import { QueriesOverTimeRowLabelTooltip } from './queries-over-time-row-label-tooltip';
import { useQueriesOverTime } from '../../../dataLayer/hooks/queriesOverTime';
import { type SiloFilterExpression, type SiloReadFilter } from '../../../dataLayer/queries';
import { type TemporalGranularity } from '../../../types/dashboardComponents';
import { type Map2DContents, Map2dView } from '../../../util/map2d';
import { type Temporal, toTemporalClass } from '../../../util/temporalClass';
import { ErrorBoundary } from '../../shared/error-boundary';
import { LoadingDisplay } from '../../shared/loading-display';
import { NoDataDisplay } from '../../shared/no-data-display';
import { useBandViewSettings } from '../band-view-settings';
import { CsvDownloadButton } from '../csv-download-button';
import { FeatureBands, type FeatureRenderer } from '../feature-bands';
import { DEFAULT_FEATURE_SORT, sortRowLabels, type FeatureSort } from '../featureSort';
import { HoverTooltip } from '../hover-tooltip';
import { type ProportionInterval } from '../mutationsOverTime/getFilteredMutationCodes';
import { type ProportionValue, getProportion } from '../overTime/proportionValue';
import { ViewSettingsControls } from '../view-settings-controls';

export type QueriesOverTimeQuery = {
    /** Unique among the queries. */
    displayLabel: string;
    description?: string;
    /** The advanced-query string, kept for display in the row-label tooltip. */
    query: string;
    /** The parsed, genome-only expression that SILO is asked (see `data/queriesOverTime.ts`). */
    filter: SiloFilterExpression;
};

export type QueriesOverTimeProps = {
    filter: SiloReadFilter;
    queries: QueriesOverTimeQuery[];
    granularity: TemporalGranularity;
    /** Only queries whose mean proportion over the time range lies within this interval are shown. */
    meanProportionInterval: ProportionInterval;
    pageSizes: number[];
};

export const QueriesOverTime: FC<QueriesOverTimeProps> = (props) => {
    const { filter, queries, granularity } = props;
    return (
        <ErrorBoundary resetKeys={[filter, queries, granularity]}>
            <QueriesOverTimeWithoutErrors {...props} />
        </ErrorBoundary>
    );
};

const QueriesOverTimeWithoutErrors: FC<QueriesOverTimeProps> = ({ ...componentProps }) => {
    const { filter, queries, granularity } = componentProps;

    const { data: queryOverTimeData, isLoading } = useQueriesOverTime(filter, granularity, queries);
    // Up here rather than next to the rows, so it survives the reloading when the filters change.
    const [sort, setSort] = useState(DEFAULT_FEATURE_SORT);
    const [pageSize, setPageSize] = useState(componentProps.pageSizes[0]);

    if (isLoading) {
        return <LoadingDisplay />;
    }

    if (queryOverTimeData === null || queryOverTimeData.keysFirstAxis.size === 0) {
        return <NoDataDisplay />;
    }

    return (
        <QueriesOverTimeWithData
            queryOverTimeData={queryOverTimeData}
            originalComponentProps={componentProps}
            sort={sort}
            setSort={setSort}
            pageSize={pageSize}
            setPageSize={setPageSize}
        />
    );
};

type QueriesOverTimeWithDataProps = {
    queryOverTimeData: Map2DContents<string, Temporal, ProportionValue>;
    originalComponentProps: QueriesOverTimeProps;
    sort: FeatureSort;
    setSort: (sort: FeatureSort) => void;
    pageSize: number;
    setPageSize: (pageSize: number) => void;
};

const QueriesOverTimeWithData: FC<QueriesOverTimeWithDataProps> = ({
    queryOverTimeData,
    originalComponentProps,
    sort,
    setSort,
    pageSize,
    setPageSize,
}) => {
    const [pageIndex, setPageIndex] = useState(0);

    const proportionInterval = originalComponentProps.meanProportionInterval;
    const [viewSettings, setViewSettings] = useBandViewSettings();
    const { showEmptyDates } = viewSettings;

    const meanProportions = useMemo(() => getMeanProportions(queryOverTimeData), [queryOverTimeData]);

    const filteredData = useMemo(() => {
        return getFilteredQueryOverTimeData({
            data: queryOverTimeData,
            meanProportions,
            proportionInterval,
            showEmptyDates,
        });
    }, [queryOverTimeData, meanProportions, proportionInterval, showEmptyDates]);

    const sortedQueries = useMemo(
        () => sortRowLabels(filteredData.getFirstAxisKeys(), sort, { meanProportions }),
        [filteredData, sort, meanProportions],
    );

    useEffect(() => setPageIndex(0), [filteredData]);

    const changeSort = (newSort: FeatureSort) => {
        setSort(newSort);
        setPageIndex(0);
    };

    const changePageSize = (newPageSize: number) => {
        setPageSize(newPageSize);
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
                    <HoverTooltip
                        content={
                            <QueriesOverTimeRowLabelTooltip
                                query={queryObject ?? { displayLabel: value, description: undefined, query: '' }}
                            />
                        }
                        placement='right'
                        focusable
                    >
                        <div className='mr-2 text-center whitespace-nowrap'>
                            <span>{value}</span>
                        </div>
                    </HoverTooltip>
                );
            },
            describe: (query, value) =>
                value.type === 'noCoverage' ? (
                    <p className='text-gray-600'>No reads cover the query.</p>
                ) : (
                    <>
                        <p>
                            {value.count} <span className='text-gray-600'>match the query {query} out of</span>
                        </p>
                        <p>
                            {value.coverage} <span className='text-gray-600'>with coverage for this query.</span>
                        </p>
                    </>
                ),
        }),
        [queryLookupMap],
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
        <div className='border border-stone-300 bg-white'>
            <FeatureBands
                rowLabelHeader='Query'
                data={pageData}
                isLoading={false}
                loadingRowLabels={[]}
                requestedDateRanges={filteredData.getSecondAxisKeys()}
                viewSettings={viewSettings}
                featureRenderer={queryRenderer}
                pagination={{
                    pageIndex,
                    pageSize,
                    pageSizes: originalComponentProps.pageSizes,
                    totalRows: sortedQueries.length,
                    onPageChange: setPageIndex,
                    onPageSizeChange: changePageSize,
                    startContent: paginationStart,
                    endContent: paginationEnd,
                }}
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
