import { describe, expect, test } from 'vitest';

import { buildQueriesMatrix } from './queriesOverTime';
import { buildDateAxis } from './mutationsOverTime';
import { getProportion } from '../query/queryMutationsOverTime';
import { type NamedCount } from '../queries/rows';

const axis = buildDateAxis(
    [
        { name: '2026-06-01', count: 1000 },
        { name: '2026-06-08', count: 0 },
    ],
    'week',
    {},
);
const [w1, w2] = axis.requestedDateRanges;

const daily = (count: NamedCount[], coverage: NamedCount[]) => new Map([['BA.5', { count, coverage }]]);

describe('buildQueriesMatrix', () => {
    test('folds daily counts into buckets; a covered cell is count/coverage', () => {
        const matrix = buildQueriesMatrix(
            [{ displayLabel: 'BA.5' }],
            'week',
            axis.requestedDateRanges,
            axis.totalCountsByBucket,
            daily(
                [
                    { name: '2026-06-01', count: 60 },
                    { name: '2026-06-03', count: 30 }, // same week
                ],
                [
                    { name: '2026-06-01', count: 100 },
                    { name: '2026-06-03', count: 50 },
                ],
            ),
        );

        const row = [...matrix.data.keys()][0];
        expect(getProportion(matrix.data.get(row)!.get(w1.dateString) ?? null)).toBeCloseTo(90 / 150);
        // week 2: no reads at all -> null, not zero
        expect(matrix.data.get(row)!.get(w2.dateString)).toBeNull();
    });

    test('a bucket with reads but no coverage for the query is belowThreshold', () => {
        const matrix = buildQueriesMatrix([{ displayLabel: 'BA.5' }], 'week', [w1], [1000], daily([], []));
        expect(matrix.data.get('BA.5')!.get(w1.dateString)).toEqual({ type: 'belowThreshold', totalCount: 1000 });
    });

    test('count above the query coverage is still reported (proportion can exceed the alt count)', () => {
        const matrix = buildQueriesMatrix(
            [{ displayLabel: 'BA.5' }],
            'week',
            [w1],
            [1000],
            daily([{ name: '2026-06-01', count: 8 }], [{ name: '2026-06-01', count: 10 }]),
        );
        expect(matrix.data.get('BA.5')!.get(w1.dateString)).toEqual({
            type: 'valueWithCoverage',
            count: 8,
            coverage: 10,
            totalCount: 1000,
        });
    });

    test('the axes carry every query and every bucket', () => {
        const matrix = buildQueriesMatrix(
            [{ displayLabel: 'BA.5' }, { displayLabel: 'XBB' }],
            'week',
            axis.requestedDateRanges,
            axis.totalCountsByBucket,
            new Map(),
        );
        expect([...matrix.keysFirstAxis.keys()]).toEqual(['BA.5', 'XBB']);
        expect([...matrix.keysSecondAxis.keys()]).toEqual([w1.dateString, w2.dateString]);
    });
});
