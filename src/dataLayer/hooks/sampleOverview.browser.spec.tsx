import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type FC, type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConnectionProvider } from './connection';
import { useSampleOverview } from './sampleOverview';
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

describe('useSampleOverview', () => {
    it('reads one entry per sample, unfiltered', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            ndjson([
                { locationName: 'Basel (BS)', date: '2024-01-10', sampleId: 'A1', batchId: 'B1', n: 10 },
                { locationName: 'Basel (BS)', date: '2024-02-05', sampleId: 'A2', batchId: 'B2', n: 8 },
                { locationName: 'Zürich (ZH)', date: '2024-01-12', sampleId: 'Z1', batchId: 'B1', n: 5 },
            ]),
        );
        vi.stubGlobal('fetch', fetchMock);

        const { result } = renderHook(() => useSampleOverview(), { wrapper: wrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([
            { locationName: 'Basel (BS)', date: '2024-01-10', sampleId: 'A1', batchId: 'B1', reads: 10 },
            { locationName: 'Basel (BS)', date: '2024-02-05', sampleId: 'A2', batchId: 'B2', reads: 8 },
            { locationName: 'Zürich (ZH)', date: '2024-01-12', sampleId: 'Z1', batchId: 'B1', reads: 5 },
        ]);

        const [, init] = fetchMock.mock.calls[0];
        expect(init.body).toBe('default.groupBy({n := count()}, {locationName, date, sampleId, batchId})');
    });
});
