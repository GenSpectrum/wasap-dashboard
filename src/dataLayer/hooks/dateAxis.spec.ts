import { describe, expect, test } from 'vitest';

import { buildDateAxis } from './dateAxis';

describe('buildDateAxis', () => {
    test('buckets days, gap-fills, aligns totals', () => {
        const { requestedDateRanges, totalCountsByBucket } = buildDateAxis(
            [
                { name: '2026-06-01', count: 10 },
                { name: '2026-06-01', count: 5 },
                { name: '2026-06-03', count: 20 },
            ],
            'day',
            {},
        );
        expect(requestedDateRanges.map((b) => b.dateString)).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
        expect(totalCountsByBucket).toEqual([15, 0, 20]);
    });

    test('filter bounds win over the data extent', () => {
        const { requestedDateRanges } = buildDateAxis([{ name: '2026-06-10', count: 3 }], 'day', {
            samplingDateFrom: '2026-06-09',
            samplingDateTo: '2026-06-11',
        });
        expect(requestedDateRanges.map((b) => b.dateString)).toEqual(['2026-06-09', '2026-06-10', '2026-06-11']);
    });
});
