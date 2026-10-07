import { type FC, useEffect, useMemo } from 'react';

import { getFilteredQueryOverTimeData, getMeanProportions } from './getFilteredQueriesOverTimeData';
import { QueriesOverTimeRowLabelTooltip } from './queries-over-time-row-label-tooltip';
import { useQueriesOverTime } from '../../../dataLayer/hooks/queriesOverTime';
import { type SiloFilterExpression, type SiloReadFilter } from '../../../dataLayer/queries';
import { type TemporalGranularity } from '../../../types/dashboardComponents';
import { type Map2DContents, Map2dView } from '../../../util/map2d';
import { type Temporal } from '../../../util/temporalClass';
import { ErrorBoundary } from '../../shared/error-boundary';
import { LoadingDisplay } from '../../shared/loading-display';
import { NoDataDisplay } from '../../shared/no-data-display';
import { useBandViewSettings } from '../band-view-settings';
import { type FeatureRenderer } from '../feature-bands';
import { sortRowLabels } from '../featureSort';
import { HoverTooltip } from '../hover-tooltip';
import { type ProportionInterval } from '../mutationsOverTime/getFilteredMutationCodes';
import { OverTimeGrid, proportionsByDate, useOverTimeGridState, type OverTimeGridState } from '../over-time-grid';
import { TotalInDateRange } from '../over-time-grid-tooltip';
import { type ProportionValue } from '../overTime/proportionValue';

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

const QueriesOverTimeWithoutErrors: FC<QueriesOverTimeProps> = (props) => {
    const { filter, queries, granularity, pageSizes } = props;

    const { data: queryOverTimeData, isLoading } = useQueriesOverTime(filter, granularity, queries);
    const gridState = useOverTimeGridState(pageSizes);

    if (isLoading) {
        return <LoadingDisplay />;
    }

    if (queryOverTimeData === null || queryOverTimeData.keysFirstAxis.size === 0) {
        return <NoDataDisplay />;
    }

    return <QueriesOverTimeWithData queryOverTimeData={queryOverTimeData} props={props} gridState={gridState} />;
};

const QueriesOverTimeWithData: FC<{
    queryOverTimeData: Map2DContents<string, Temporal, ProportionValue>;
    props: QueriesOverTimeProps;
    gridState: OverTimeGridState;
}> = ({ queryOverTimeData, props, gridState }) => {
    const { queries, meanProportionInterval } = props;
    const [{ showEmptyDates }] = useBandViewSettings();

    const meanProportions = useMemo(() => getMeanProportions(queryOverTimeData), [queryOverTimeData]);

    const filteredData = useMemo(
        () =>
            getFilteredQueryOverTimeData({
                data: queryOverTimeData,
                meanProportions,
                proportionInterval: meanProportionInterval,
                showEmptyDates,
            }),
        [queryOverTimeData, meanProportions, meanProportionInterval, showEmptyDates],
    );

    const sort = gridState.sortOr();
    const sortedQueries = useMemo(
        () => sortRowLabels(filteredData.getFirstAxisKeys(), sort, { meanProportions }),
        [filteredData, sort, meanProportions],
    );

    const { setPageIndex } = gridState;
    useEffect(() => setPageIndex(0), [filteredData, setPageIndex]);

    const queryLookupMap = useMemo(() => new Map(queries.map((query) => [query.displayLabel, query])), [queries]);

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
                    <>
                        <p className='text-gray-600'>No reads cover the query.</p>
                        <TotalInDateRange value={value} />
                    </>
                ) : (
                    <>
                        <p>
                            {value.count} <span className='text-gray-600'>match the query {query} out of</span>
                        </p>
                        <p>
                            {value.coverage} <span className='text-gray-600'>with coverage for this query.</span>
                        </p>
                        <TotalInDateRange value={value} />
                    </>
                ),
        }),
        [queryLookupMap],
    );

    const { pageOf } = gridState;
    const pageData = useMemo(() => {
        const page = new Map2dView(filteredData);
        page.selectRows(pageOf(sortedQueries));
        return page;
    }, [filteredData, sortedQueries, pageOf]);

    return (
        <OverTimeGrid
            state={gridState}
            rowLabelHeader='Query'
            data={pageData}
            isLoading={false}
            loadingRowLabels={[]}
            requestedDateRanges={filteredData.getSecondAxisKeys()}
            featureRenderer={queryRenderer}
            totalRows={sortedQueries.length}
            csv={{
                filename: 'queries_over_time.csv',
                getRows: () =>
                    filteredData
                        .getFirstAxisKeys()
                        .map((query) => ({ query, ...proportionsByDate(filteredData, query) })),
            }}
            meanProportions={meanProportions}
            sort={sort}
        />
    );
};
