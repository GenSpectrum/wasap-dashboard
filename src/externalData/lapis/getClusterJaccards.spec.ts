import dayjs from 'dayjs';
import { describe, expect, test } from 'vitest';

import { getClusterJaccards } from './getClusterJaccards';
import { DUMMY_LAPIS_URL } from '../../../routeMocker';
import { lapisRouteMocker } from '../../../vitest.setup';

const source = {
    lapisBaseUrl: DUMMY_LAPIS_URL,
    lineageQuery: 'pangoLineage=XEC*',
    dateField: 'date',
    dateFrom: '2026-04-01',
};

describe('getClusterJaccards', () => {
    test('asks for the lineage and every cluster in one request, and computes their Jaccard indices', async () => {
        lapisRouteMocker.mockPostQueriesOverTime(
            {
                filters: {},
                queries: [
                    { countQuery: 'pangoLineage=XEC*', coverageQuery: 'pangoLineage=XEC*' },
                    { countQuery: 'pangoLineage=XEC* & C100T & G300A', coverageQuery: 'C100T & G300A' },
                    { countQuery: 'pangoLineage=XEC* & A200-', coverageQuery: 'A200-' },
                ],
                dateRanges: [{ dateFrom: '2026-04-01', dateTo: dayjs().format('YYYY-MM-DD') }],
                dateField: 'date',
            },
            {
                data: {
                    data: [
                        [{ count: 150, coverage: 150 }],
                        [{ count: 100, coverage: 200 }],
                        [{ count: 0, coverage: 0 }],
                    ],
                },
            },
        );

        const jaccards = await getClusterJaccards(source, [['C100T', 'G300A'], ['A200-']]);

        // 100 / (150 + 200 - 100) = 0.4; no sequence with A200- at all: 0
        expect(jaccards).toEqual([0.4, 0]);
    });

    test('takes all of the time from long ago without a start date', async () => {
        lapisRouteMocker.mockPostQueriesOverTime(
            {
                filters: {},
                queries: [
                    { countQuery: 'pangoLineage=XEC*', coverageQuery: 'pangoLineage=XEC*' },
                    { countQuery: 'pangoLineage=XEC* & C100T', coverageQuery: 'C100T' },
                ],
                dateRanges: [{ dateFrom: '1900-01-01', dateTo: dayjs().format('YYYY-MM-DD') }],
                dateField: 'date',
            },
            { data: { data: [[{ count: 10, coverage: 10 }], [{ count: 10, coverage: 10 }]] } },
        );

        expect(await getClusterJaccards({ ...source, dateFrom: undefined }, [['C100T']])).toEqual([1]);
    });
});
