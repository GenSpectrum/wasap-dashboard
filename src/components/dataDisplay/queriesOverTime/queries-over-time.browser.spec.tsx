import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { QueriesOverTime } from './queries-over-time';
import { ConnectionProvider } from '../../../dataLayer/hooks/connection';
import type { SiloSchema } from '../../../dataLayer/queries/schema';

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

/**
 * Routes the SILO queries the component sends to canned NDJSON:
 *  - the date axis (`groupBy({n := count()}, {date}).orderBy(...)`) -> two day buckets, 1000 reads each
 *  - the coverage query per query (`... maybe(nucleotideEquals(position := P ...`) -> 1000/day
 *  - the count query per query (`nucleotideEquals(position := P ...`, no `maybe`) -> 900/day for 241, 100/day for 3037
 *
 * So C241T is 900/1000 = 90% in every bucket, C3037T is 100/1000 = 10%.
 */
function stubSilo() {
    const fetchMock = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
        const q = typeof init?.body === 'string' ? init.body : '';
        const twoDays = (n: number) =>
            ndjson([
                { date: '2026-06-01', n },
                { date: '2026-06-02', n },
            ]);

        const has241 = q.includes('nucleotideEquals(position := 241');
        const has3037 = q.includes('nucleotideEquals(position := 3037');
        if (q.includes('maybe(')) {
            return Promise.resolve(twoDays(1000)); // coverage, either query
        }
        if (has241) {
            return Promise.resolve(twoDays(900));
        }
        if (has3037) {
            return Promise.resolve(twoDays(100));
        }
        return Promise.resolve(twoDays(1000)); // date axis
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

const queries = [
    {
        displayLabel: 'C241T',
        query: 'C241T',
        filter: { type: 'NucleotideEquals' as const, sequenceName: 'main', position: 241, symbol: 'T' },
    },
    {
        displayLabel: 'C3037T',
        query: 'C3037T',
        filter: { type: 'NucleotideEquals' as const, sequenceName: 'main', position: 3037, symbol: 'T' },
    },
];

function renderOverTime(pageSizes = [10, 20]) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ConnectionProvider url='https://silo.example.org/covid' schema={schema}>
                <QueriesOverTime
                    width='100%'
                    filter={{ samplingDateFrom: '2026-06-01', samplingDateTo: '2026-06-02' }}
                    granularity='day'
                    queries={queries}
                    meanProportionInterval={{ min: 0, max: 1 }}
                    pageSizes={pageSizes}
                />
            </ConnectionProvider>
        </QueryClientProvider>,
    );
}

afterEach(() => vi.unstubAllGlobals());

describe('QueriesOverTime (SILO)', () => {
    it('renders a row per query, and the first and last date bucket', async () => {
        stubSilo();
        const screen = renderOverTime();

        await expect.element(screen.getByText('2026-06-01').first()).toBeInTheDocument();
        await expect.element(screen.getByText('2026-06-02').first()).toBeInTheDocument();

        await expect.element(screen.getByText('C241T').first()).toBeInTheDocument();
        await expect.element(screen.getByText('C3037T').first()).toBeInTheDocument();
    });

    it('sends a count and a coverage query per query, scoped and grouped by date', async () => {
        const fetchMock = stubSilo();
        renderOverTime();

        const bodies = () => fetchMock.mock.calls.map(([, init]) => (typeof init?.body === 'string' ? init.body : ''));
        const countQuery =
            "default.filter(date >= '2026-06-01' && date <= '2026-06-02' && " +
            "nucleotideEquals(position := 241, symbol := 'T', sequenceName := 'main'))" +
            '.groupBy({n := count()}, {date})';
        const coverageQuery =
            "default.filter(date >= '2026-06-01' && date <= '2026-06-02' && " +
            "(nucleotideEquals(position := 241, symbol := 'T', sequenceName := 'main') || " +
            "!maybe(nucleotideEquals(position := 241, symbol := 'T', sequenceName := 'main'))))" +
            '.groupBy({n := count()}, {date})';

        await vi.waitFor(() => {
            expect(bodies()).toContain(countQuery);
            expect(bodies()).toContain(coverageQuery);
        });
    });

    it('shows the mean proportion of each query', async () => {
        stubSilo();
        const screen = renderOverTime();

        const firstRow = screen.getByRole('row').filter({ hasText: 'C241T' });
        await expect.element(firstRow.getByRole('cell', { name: '90.0%' })).toBeInTheDocument();
        const secondRow = screen.getByRole('row').filter({ hasText: 'C3037T' });
        await expect.element(secondRow.getByRole('cell', { name: '10.0%' })).toBeInTheDocument();
    });

    it('sorts all the queries, not just those of the page, by the column whose header is clicked', async () => {
        stubSilo();
        // One query per page, so the one shown is the first in the order.
        const screen = renderOverTime([1]);

        await expect.element(screen.getByText('C241T').first()).toBeInTheDocument();
        await expect.element(screen.getByText('C3037T').first()).not.toBeInTheDocument();

        await screen.getByRole('button', { name: 'Query' }).click();
        await expect.element(screen.getByText('C3037T').first()).toBeInTheDocument();
        await expect.element(screen.getByText('C241T').first()).not.toBeInTheDocument();

        await screen.getByRole('button', { name: 'Mean proportion' }).click();
        await expect.element(screen.getByText('C241T').first()).toBeInTheDocument();

        await screen.getByRole('button', { name: 'Mean proportion' }).click();
        await expect.element(screen.getByText('C3037T').first()).toBeInTheDocument();
    });
});
