import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type FC, type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useResolvedSamplingDate } from './useResolvedSamplingDate';
import { ConnectionProvider } from '../../../dataLayer/hooks/connection';
import type { SiloSchema } from '../../../dataLayer/queries/schema';

const schema: SiloSchema = {
    table: 'default',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
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

describe('useResolvedSamplingDate', () => {
    it('returns an already-resolved samplingDate immediately, without reading the date extent', () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const samplingDate = { label: 'Custom', dateFrom: '2024-01-01', dateTo: '2024-12-31' };
        const { result } = renderHook(() => useResolvedSamplingDate(samplingDate), { wrapper: wrapper() });

        expect(result.current).toEqual({ samplingDate, isPending: false });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('resolves a preset label against the dataset date range', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            ndjson([
                { date: '2024-01-01', n: 1 },
                { date: '2024-06-30', n: 3 },
            ]),
        );
        vi.stubGlobal('fetch', fetchMock);

        const { result } = renderHook(() => useResolvedSamplingDate({ label: 'Most recent 14 days' }), {
            wrapper: wrapper(),
        });

        expect(result.current.isPending).toBe(true);

        await waitFor(() => expect(result.current.isPending).toBe(false));
        expect(result.current.samplingDate).toEqual({
            label: 'Most recent 14 days',
            dateFrom: '2024-06-17',
            dateTo: '2024-06-30',
        });
    });

    it('falls back to "All times" bounded by the dataset when the label matches no known preset', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            ndjson([
                { date: '2024-01-01', n: 1 },
                { date: '2024-06-30', n: 3 },
            ]),
        );
        vi.stubGlobal('fetch', fetchMock);

        const { result } = renderHook(() => useResolvedSamplingDate({ label: 'Some unknown preset' }), {
            wrapper: wrapper(),
        });

        await waitFor(() => expect(result.current.isPending).toBe(false));
        expect(result.current.samplingDate).toEqual({ label: 'All times', dateFrom: '2024-01-01' });
    });

    it('falls back to a fully unbounded "All times" when the date extent fails to load', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('error', { status: 500 }));
        vi.stubGlobal('fetch', fetchMock);

        const { result } = renderHook(() => useResolvedSamplingDate({ label: 'Most recent 30 days' }), {
            wrapper: wrapper(),
        });

        await waitFor(() => expect(result.current.isPending).toBe(false));
        expect(result.current.samplingDate).toEqual({ label: 'All times' });
    });

    it('treats a missing samplingDate as "All times" and bounds it to the dataset', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            ndjson([
                { date: '2024-01-01', n: 1 },
                { date: '2024-06-30', n: 3 },
            ]),
        );
        vi.stubGlobal('fetch', fetchMock);

        const { result } = renderHook(() => useResolvedSamplingDate(undefined), { wrapper: wrapper() });

        await waitFor(() => expect(result.current.isPending).toBe(false));
        expect(result.current.samplingDate).toEqual({ label: 'All times', dateFrom: '2024-01-01' });
    });

    it('does not query SILO when the samplingDate already has concrete dates', () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        renderHook(() => useResolvedSamplingDate({ label: 'Custom', dateFrom: '2024-01-01', dateTo: '2024-12-31' }), {
            wrapper: wrapper(),
        });

        expect(fetchMock).not.toHaveBeenCalled();
    });
});
