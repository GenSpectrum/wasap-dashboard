import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type FC, type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConnectionProvider } from './connection';
import { useQueriesOverTime } from './queriesOverTime';
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

/** One day with 1000 reads, all of which cover the query; the query count is 900 in Zürich and 100 in Basel. */
function stubSilo() {
    vi.stubGlobal(
        'fetch',
        vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
            const query = typeof init?.body === 'string' ? init.body : '';
            const isCount = query.includes('nucleotideEquals(') && !query.includes('maybe(');
            const n = !isCount ? 1000 : query.includes('Zürich') ? 900 : 100;
            return Promise.resolve(ndjson([{ date: '2026-06-01', n }]));
        }),
    );
}

// The same array across renders, as a collection's queries are while only the dataset filter changes.
const queries = [
    {
        displayLabel: 'C241T',
        filter: { type: 'NucleotideEquals' as const, sequenceName: 'main', position: 241, symbol: 'T' },
    },
];

afterEach(() => vi.unstubAllGlobals());

describe('useQueriesOverTime', () => {
    it("shows a location's own counts when going back to it after another one", async () => {
        stubSilo();
        const { result, rerender } = renderHook(
            ({ locationName }: { locationName: string }) =>
                useQueriesOverTime({ locationName, samplingDateFrom: '2026-06-01' }, 'day', queries),
            { wrapper: wrapper(), initialProps: { locationName: 'Zürich' } },
        );
        const count = () => {
            const cell = [...(result.current.data?.data.get('C241T')?.values() ?? [])][0];
            return cell?.type === 'value' ? cell.count : undefined;
        };

        await waitFor(() => expect(count()).toBe(900));

        rerender({ locationName: 'Basel' });
        await waitFor(() => expect(count()).toBe(100));

        // Zürich's results are cached now, so they are there right away.
        rerender({ locationName: 'Zürich' });
        await waitFor(() => expect(count()).toBe(900));
    });
});
