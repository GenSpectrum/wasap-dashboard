import { type FC, useEffect, useMemo } from 'react';

import { QueriesOverTimeRowLabelTooltip } from './QueriesOverTimeRowLabelTooltip';
import { getFilteredQueryOverTimeData, getMeanProportions } from './getFilteredQueriesOverTimeData';
import { useQueriesOverTime } from '../../../dataLayer/hooks/analyses/queriesOverTime';
import { type RhydbFilterExpression, type RhydbReadFilter } from '../../../dataLayer/queries';
import { type TemporalGranularity } from '../../../types/dashboardComponents';
import { type Map2DContents, Map2dView } from '../../../util/map2d';
import { type Temporal } from '../../../util/temporalClass';
import { ErrorBoundary } from '../../ui/ErrorBoundary';
import { HoverTooltip } from '../../ui/HoverTooltip';
import { LoadingDisplay } from '../../ui/LoadingDisplay';
import { NoDataDisplay } from '../../ui/NoDataDisplay';
import { type FeatureRenderer } from '../FeatureBands';
import { OverTimeGrid, proportionsByDate, useOverTimeGridState, type OverTimeGridState } from '../OverTimeGrid';
import { TotalInDateRange } from '../OverTimeGridTooltip';
import { useBandViewSettings } from '../bandViewSettings';
import { sortRowLabels } from '../featureSort';
import { type ProportionInterval } from '../mutationsOverTime/getFilteredMutationCodes';
import { type ProportionValue } from '../proportionValue';

export type QueriesOverTimeQuery = {
    /** Unique among the queries. */
    displayLabel: string;
    description?: string;
    /** The advanced-query string, kept for display in the row-label tooltip. */
    query: string;
    /** The parsed, genome-only expression that RhyDB is asked (see `data/queriesOverTime.ts`). */
    filter: RhydbFilterExpression;
};

export type QueriesOverTimeProps = {
    filter: RhydbReadFilter;
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
