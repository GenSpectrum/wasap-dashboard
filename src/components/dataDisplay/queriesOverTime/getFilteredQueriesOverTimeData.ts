import { Map2dBase, Map2dView, type Map2DContents } from '../../../util/map2d';
import { type Temporal } from '../../../util/temporalClass';
import { hideGapsInPlace, type ProportionValue, serializeTemporal } from '../overTime/proportionValue';

export type GetFilteredQueryOverTimeDataArgs = {
    data: Map2DContents<string, Temporal, ProportionValue>;
    /** See `getMeanProportions`. */
    meanProportions: Partial<Record<string, number>>;
    proportionInterval: { min: number; max: number };
    hideGaps: boolean;
};

/**
 * Create a Map2d wrapper for query over time data.
 * Uses displayLabel strings as the first axis (queries) and Temporal objects as the second axis (dates).
 */
export class QueryOverTimeDataMap extends Map2dBase<string, Temporal, ProportionValue> {
    constructor(initialContent: Map2DContents<string, Temporal, ProportionValue>) {
        super((displayLabel) => displayLabel, serializeTemporal, initialContent);
    }
}

/**
 * The proportion of each query over the whole time range (all its counts over all its coverage),
 * by display label. A query that no read covered has none.
 */
export function getMeanProportions(
    data: Map2DContents<string, Temporal, ProportionValue>,
): Partial<Record<string, number>> {
    const dataMap = new QueryOverTimeDataMap(data);
    const dates = dataMap.getSecondAxisKeys();

    return Object.fromEntries(
        dataMap.getFirstAxisKeys().flatMap((query) => {
            let totalCount = 0;
            let totalCoverage = 0;

            dates.forEach((date) => {
                const value = dataMap.get(query, date);
                if (value?.type === 'value') {
                    totalCount += value.count;
                    totalCoverage += value.coverage;
                }
            });

            return totalCoverage > 0 ? [[query, totalCount / totalCoverage]] : [];
        }),
    );
}

export function getFilteredQueryOverTimeData({
    data,
    meanProportions,
    proportionInterval,
    hideGaps,
}: GetFilteredQueryOverTimeDataArgs) {
    const dataMap = new QueryOverTimeDataMap(data);
    const filteredData = new Map2dView(dataMap);

    const queriesToFilterOut = filteredData.getFirstAxisKeys().filter((query) => {
        // A query without a mean proportion counts as 0, as it always has.
        const meanProportion = meanProportions[query] ?? 0;
        return meanProportion < proportionInterval.min || meanProportion > proportionInterval.max;
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
