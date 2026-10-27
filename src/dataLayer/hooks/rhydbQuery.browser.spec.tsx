import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type FC, type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConnectionProvider, createRhydbQueryClient, useRhydbQueryClient } from './connection';
import { useTotalReadCount } from './lookups/totalReadCount';
import type { RhydbSchema } from '../queries/schema';

const schema: RhydbSchema = {
    table: 'data',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

function wrapper(rhydbQueryClient?: QueryClient): FC<PropsWithChildren> {
    // The app-wide client retries; RhyDB reads must not end up on it.
    const appQueryClient = new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 0 } } });
    return ({ children }) => (
        <QueryClientProvider client={appQueryClient}>
            <ConnectionProvider url='https://rhydb.example.org/covid' schema={schema} queryClient={rhydbQueryClient}>
                {children}
            </ConnectionProvider>
        </QueryClientProvider>
    );
}

afterEach(() => vi.unstubAllGlobals());

describe('RhyDB queries', () => {
    it('send a rejected query once, not again for each retry of the app-wide query client', async () => {
        const fetchMock = vi.fn(() =>
            Promise.resolve(new Response(JSON.stringify({ error: 'Bad request', message: 'no' }), { status: 400 })),
        );
        vi.stubGlobal('fetch', fetchMock);

        const { result } = renderHook(() => useTotalReadCount(), { wrapper: wrapper() });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('are cached on the query client the provider is given', () => {
        const rhydbQueryClient = createRhydbQueryClient();
        const { result } = renderHook(() => useRhydbQueryClient(), { wrapper: wrapper(rhydbQueryClient) });
        expect(result.current).toBe(rhydbQueryClient);
    });
});
