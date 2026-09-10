import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from 'vitest-browser-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueriesOverTime } from './queries-over-time';
import { ConnectionProvider } from '../../data/connection';
import { views } from '../../../types/dashboardComponents';
import type { SiloSchema } from '../../../queries/schema';

const schema: SiloSchema = {
    table: 'default',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
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
        const q = String(init?.body ?? '');
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

function renderOverTime() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ConnectionProvider url='https://silo.example.org/covid' schema={schema}>
                <QueriesOverTime
                    width='100%'
                    filter={{ samplingDateFrom: '2026-06-01', samplingDateTo: '2026-06-02' }}
                    views={[views.grid]}
                    granularity='day'
                    queries={queries}
                    initialMeanProportionInterval={{ min: 0, max: 1 }}
                    pageSizes={[10, 20]}
                />
            </ConnectionProvider>
        </QueryClientProvider>,
    );
}

afterEach(() => vi.unstubAllGlobals());

describe('QueriesOverTime (SILO)', () => {
    it('renders a column per date bucket, a row per query, cells = count / coverage', async () => {
        stubSilo();
        const screen = renderOverTime();

        await expect.element(screen.getByText('2026-06-01').first()).toBeInTheDocument();
        await expect.element(screen.getByText('2026-06-02').first()).toBeInTheDocument();

        await expect.element(screen.getByText('C241T').first()).toBeInTheDocument();
        await expect.element(screen.getByText('C3037T').first()).toBeInTheDocument();

        await expect.element(screen.getByText('90%').first()).toBeInTheDocument();
        await expect.element(screen.getByText('10%').first()).toBeInTheDocument();
    });

    it('sends a count and a coverage query per query, scoped and grouped by date', async () => {
        const fetchMock = stubSilo();
        const screen = renderOverTime();
        await expect.element(screen.getByText('90%').first()).toBeInTheDocument();

        const bodies = fetchMock.mock.calls.map(([, init]) => String((init as RequestInit | undefined)?.body ?? ''));

        expect(
            bodies.some(
                (body) =>
                    body ===
                    "default.filter(date >= '2026-06-01' && date <= '2026-06-02' && " +
                        "nucleotideEquals(position := 241, symbol := 'T', sequenceName := 'main'))" +
                        '.groupBy({n := count()}, {date})',
            ),
        ).toBe(true);
        expect(
            bodies.some(
                (body) =>
                    body ===
                    "default.filter(date >= '2026-06-01' && date <= '2026-06-02' && " +
                        "(nucleotideEquals(position := 241, symbol := 'T', sequenceName := 'main') || " +
                        "!maybe(nucleotideEquals(position := 241, symbol := 'T', sequenceName := 'main'))))" +
                        '.groupBy({n := count()}, {date})',
            ),
        ).toBe(true);
    });
});
