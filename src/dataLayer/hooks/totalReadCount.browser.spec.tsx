import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type FC, type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConnectionProvider } from './connection';
import { useTotalReadCount } from './totalReadCount';
import type { SiloSchema } from '../queries/schema';

const schema: SiloSchema = {
    table: 'default',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

/** An NDJSON `Response`, as SILO's `/query` returns. */
function ndjson(rows: unknown[]): Response {
    return new Response(rows.map((row) => JSON.stringify(row)).join('\n'), {
        status: 200,
        headers: { 'content-type': 'application/x-ndjson', 'data-version': '1750000000' },
    });
}

function wrapper(): FC<PropsWithChildren> {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }) => (
        <QueryClientProvider client={queryClient}>
            <ConnectionProvider url='https://silo.example.org/covid' schema={schema}>
                {children}
            </ConnectionProvider>
        </QueryClientProvider>
    );
}

afterEach(() => vi.unstubAllGlobals());

describe('useTotalReadCount', () => {
    it('reads n off the single row, and carries the filter into the query', async () => {
        const fetchMock = vi.fn().mockResolvedValue(ndjson([{ locationName: 'Basel (BS)', n: 596520334 }]));
        vi.stubGlobal('fetch', fetchMock);

        const { result } = renderHook(() => useTotalReadCount({ locationName: 'Basel (BS)' }), { wrapper: wrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe(596520334);

        const [, init] = fetchMock.mock.calls[0];
        expect(init.body).toBe("default.filter(locationName = 'Basel (BS)').groupBy({n := count()}, {locationName})");
    });

    it('sums the per-location rows into one total, unfiltered', async () => {
        // Grouped by location rather than a bare count, to dodge a SILO perf bug
        // (catalogue.ts) - so an unfiltered total comes back as one row per
        // location, summed client-side.
        const fetchMock = vi.fn().mockResolvedValue(
            ndjson([
                { locationName: 'Zürich (ZH)', n: 500000000 },
                { locationName: 'Basel (BS)', n: 96520334 },
            ]),
        );
        vi.stubGlobal('fetch', fetchMock);

        const { result } = renderHook(() => useTotalReadCount(), { wrapper: wrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe(596520334);

        const [, init] = fetchMock.mock.calls[0];
        expect(init.body).toBe('default.groupBy({n := count()}, {locationName})');
    });
});
