import { hideGapsInPlace, type ProportionValue } from '../../../query/queryMutationsOverTime';
import { serializeQuery, serializeTemporal } from '../../../query/queryQueriesOverTime';
import { Map2dBase, Map2dView, type Map2DContents } from '../../../util/map2d';
import { type Temporal } from '../../../util/temporalClass';

export type GetFilteredQueryOverTimeDataArgs = {
    data: Map2DContents<string, Temporal, ProportionValue>;
    proportionInterval: { min: number; max: number };
    hideGaps: boolean;
};

/**
 * Create a Map2d wrapper for query over time data.
 * Uses displayLabel strings as the first axis (queries) and Temporal objects as the second axis (dates).
 */
export class QueryOverTimeDataMap extends Map2dBase<string, Temporal, ProportionValue> {
    constructor(initialContent: Map2DContents<string, Temporal, ProportionValue>) {
        super(serializeQuery, serializeTemporal, initialContent);
    }
}

export function getFilteredQueryOverTimeData({ data, proportionInterval, hideGaps }: GetFilteredQueryOverTimeDataArgs) {
    const dataMap = new QueryOverTimeDataMap(data);
    const filteredData = new Map2dView(dataMap);

    const queries = filteredData.getFirstAxisKeys();
    const dates = filteredData.getSecondAxisKeys();

    const queriesToFilterOut = queries.filter((query) => {
        // Calculate overall proportion for this query
        let totalCount = 0;
        let totalCoverage = 0;

        dates.forEach((date) => {
            const value = filteredData.get(query, date);
            if (value?.type === 'valueWithCoverage') {
                totalCount += value.count;
                totalCoverage += value.coverage;
            }
        });

        const overallProportion = totalCoverage > 0 ? totalCount / totalCoverage : 0;

        // Filter by proportion interval
        return overallProportion < proportionInterval.min || overallProportion > proportionInterval.max;
    });

    // Remove filtered queries from the data view
    queriesToFilterOut.forEach((query) => {
        filteredData.deleteRow(query);
    });

    // Hide gaps (columns with no data)
    if (hideGaps) {
        hideGapsInPlace(filteredData);
    }

    return filteredData;
}
