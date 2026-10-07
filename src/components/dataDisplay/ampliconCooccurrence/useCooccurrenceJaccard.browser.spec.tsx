import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { type FC, type PropsWithChildren } from 'react';
import { describe, expect } from 'vitest';

import { useCooccurrenceJaccard } from './useCooccurrenceJaccard';
import { DUMMY_LAPIS_URL } from '../../../../routeMocker';
import { it } from '../../../../test-extend';
import { mutationsByAmplicon } from '../../../amplicons/mutationsByAmplicon';
import { type Amplicon } from '../../../amplicons/primerBed';
import { type CooccurrenceRow } from '../../../dataLayer/hooks/ampliconCooccurrence';

const amplicon: Amplicon = { chrom: 'ref', number: 7, pool: '1', start: 1, end: 400, insertStart: 30, insertEnd: 370 };
const { mutations } = mutationsByAmplicon(['C100T', 'G300A'], [amplicon]).groups[0];

function row(cluster: CooccurrenceRow['cluster']): CooccurrenceRow {
    const label = `Amplicon 7: ${cluster.map((mutation) => mutation.code).join(' + ')}`;
    return { amplicon, mutations, cluster, label, values: [] };
}

const source = {
    lapisBaseUrl: DUMMY_LAPIS_URL,
    lineageQuery: 'pangoLineage=XEC*',
    dateField: 'date',
    dateFrom: undefined,
};

function wrapper(): FC<PropsWithChildren> {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useCooccurrenceJaccard', () => {
    it("gives each row its cluster's Jaccard index, by label, once the one request is answered", async ({
        routeMockers,
    }) => {
        routeMockers.lapis.mockPostQueriesOverTime(
            {
                filters: {},
                queries: [
                    { countQuery: 'pangoLineage=XEC*', coverageQuery: 'pangoLineage=XEC*' },
                    { countQuery: 'pangoLineage=XEC* & C100T & G300A', coverageQuery: 'C100T & G300A' },
                ],
                dateRanges: [{ dateFrom: '1900-01-01', dateTo: dayjs().format('YYYY-MM-DD') }],
                dateField: 'date',
            },
            { data: { data: [[{ count: 150, coverage: 150 }], [{ count: 100, coverage: 200 }]] } },
        );
        const rows = [row(mutations)];

        const { result } = renderHook(() => useCooccurrenceJaccard(rows, source), { wrapper: wrapper() });

        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.jaccardIndices).toEqual({ 'Amplicon 7: C100T + G300A': 0.4 });
    });

    it('has no Jaccard indices, and loads nothing, without a source', ({ routeMockers }) => {
        routeMockers.lapis.mockLapisDown();
        const rows = [row(mutations)];

        const { result } = renderHook(() => useCooccurrenceJaccard(rows, undefined), { wrapper: wrapper() });

        expect(result.current).toEqual({ jaccardIndices: undefined, isLoading: false });
    });

    it('is not loading when there are no clusters to look up', ({ routeMockers }) => {
        routeMockers.lapis.mockLapisDown();

        const { result } = renderHook(() => useCooccurrenceJaccard([], source), { wrapper: wrapper() });

        expect(result.current).toEqual({ jaccardIndices: {}, isLoading: false });
    });
});
