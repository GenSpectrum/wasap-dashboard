import { describe, expect, test } from 'vitest';

import { getMeanProportions, QueryOverTimeDataMap } from './getFilteredQueriesOverTimeData';
import { type ProportionValue } from '../../../query/queryMutationsOverTime';
import { type Map2dBase } from '../../../util/map2d';
import { type Temporal, TemporalCache } from '../../../util/temporalClass';

const dates = [
    TemporalCache.getInstance().getYearMonthDay('2024-01-01'),
    TemporalCache.getInstance().getYearMonthDay('2024-01-02'),
];

function valueOf(count: number, coverage: number): ProportionValue {
    return { type: 'value', count, coverage, totalCount: 1000 };
}

describe('getMeanProportions', () => {
    test('is all the counts of a query over all its coverage', () => {
        const data: Map2dBase<string, Temporal, ProportionValue> = new QueryOverTimeDataMap({
            keysFirstAxis: new Map(),
            keysSecondAxis: new Map(),
            data: new Map(),
        });
        data.set('covered', dates[0], valueOf(10, 100));
        data.set('covered', dates[1], valueOf(50, 300));
        data.set('not covered', dates[0], valueOf(0, 0));
        data.set('not covered', dates[1], valueOf(0, 0));

        // (10 + 50) / (100 + 300) = 0.15; nothing measured the other one, so it has none.
        expect(getMeanProportions(data.getContents())).toEqual({ covered: 0.15 });
    });
});
