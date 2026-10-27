import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { MutationsOverTime, type MutationsOverTimeProps } from './mutations-over-time';
import { ConnectionProvider } from '../../../dataLayer/hooks/connection';
import type { RhydbSchema } from '../../../dataLayer/queries/schema';
import { MutationAnnotationsContextProvider } from '../../MutationAnnotationsContext';

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

function ndjson(rows: unknown[]): Response {
    return new Response(rows.map((row) => JSON.stringify(row)).join('\n'), {
        status: 200,
        headers: { 'content-type': 'application/x-ndjson', 'data-version': '1750000000' },
    });
}

/** The symbols at each position per day. Position 5 isn't covered by any read. */
const SYMBOLS_BY_POSITION: Record<number, { date: string; sym: string; count: number }[]> = {
    // alt `T` = 90% of coverage in both buckets
    241: [
        { date: '2026-06-01', sym: 'T', count: 900 },
        { date: '2026-06-01', sym: 'C', count: 100 },
        { date: '2026-06-02', sym: 'T', count: 1800 },
        { date: '2026-06-02', sym: 'C', count: 200 },
    ],
    // alt `T` = 10% of coverage in both buckets
    3037: [
        { date: '2026-06-01', sym: 'T', count: 100 },
        { date: '2026-06-01', sym: 'C', count: 900 },
        { date: '2026-06-02', sym: 'T', count: 200 },
        { date: '2026-06-02', sym: 'C', count: 1800 },
    ],
};

/**
 * Routes the SILO queries the component sends to canned NDJSON:
 *  - the date axis (`group(by := {date}, aggs := {n := count()})`) -> two day buckets
 *  - the positions of the display mutations, in one `unionall` -> `SYMBOLS_BY_POSITION`, each row
 *    tagged with its position
 */
function stubRhydb() {
    const fetchMock = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
        const q = typeof init?.body === 'string' ? init.body : '';

        const positions = [...q.matchAll(/main\.at\((\d+)\)/g)].map(([, position]) => Number(position));
        if (positions.length > 0) {
            return Promise.resolve(
                ndjson(
                    positions.flatMap((position) =>
                        (SYMBOLS_BY_POSITION[position] ?? []).map(({ date, sym, count }) => ({
                            day: date,
                            sym,
                            count,
                            sequenceName: 'main',
                            position,
                        })),
                    ),
                ),
            );
        }
        // date axis
        return Promise.resolve(
            ndjson([
                { date: '2026-06-01', n: 1000 },
                { date: '2026-06-02', n: 2000 },
            ]),
        );
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

function renderOverTime(props: Partial<MutationsOverTimeProps> = {}) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ConnectionProvider url='https://rhydb.example.org/covid' schema={schema}>
                <MutationAnnotationsContextProvider value={[]}>
                    <MutationsOverTime
                        filter={{ samplingDateFrom: '2026-06-01', samplingDateTo: '2026-06-02' }}
                        sequenceType='nucleotide'
                        granularity='day'
                        displayMutations={['C241T', 'C3037T']}
                        meanProportionInterval={{ min: 0, max: 1 }}
                        pageSizes={[10, 20]}
                        {...props}
                    />
                </MutationAnnotationsContextProvider>
            </ConnectionProvider>
        </QueryClientProvider>,
    );
}

afterEach(() => vi.unstubAllGlobals());

describe('MutationsOverTime (SILO position-over-time)', () => {
    it('renders a row per display mutation, and the first and last date bucket', async () => {
        stubRhydb();
        const screen = renderOverTime();

        await expect.element(screen.getByText('2026-06-01').first()).toBeInTheDocument();
        await expect.element(screen.getByText('2026-06-02').first()).toBeInTheDocument();

        await expect.element(screen.getByText('C241T').first()).toBeInTheDocument();
        await expect.element(screen.getByText('C3037T').first()).toBeInTheDocument();
    });

    it('prints the proportions, alt / coverage, over the bands once the percentage toggle is pressed', async () => {
        stubRhydb();
        const screen = renderOverTime();

        await expect.element(screen.getByText('C241T').first()).toBeInTheDocument();
        await expect.element(screen.getByText('90%').first()).not.toBeInTheDocument();

        await screen.getByRole('button', { name: 'Show percentages' }).click();

        // C241T: 900/1000 in every bucket; C3037T: 100/1000.
        await expect.element(screen.getByText('90%').first()).toBeInTheDocument();
        await expect.element(screen.getByText('10%').first()).toBeInTheDocument();
    });

    it('sends the positions in one query, which the grid takes its cells from too', async () => {
        const fetchMock = stubRhydb();
        const screen = renderOverTime();

        const firstRow = screen.getByRole('row').filter({ hasText: 'C241T' });
        await expect.element(firstRow.getByRole('cell', { name: '90.0%' })).toBeInTheDocument();
        // Time for the page to send queries of its own, if it did.
        await new Promise((resolve) => setTimeout(resolve, 200));

        const positionBodies = fetchMock.mock.calls
            .map(([, init]) => (typeof init?.body === 'string' ? init.body : ''))
            .filter((body) => body.includes('sym := main.at('));
        expect(positionBodies).toHaveLength(1);
        expect(positionBodies[0]).toContain('.unionall(');
        expect(positionBodies[0]).toContain("filter(day >= '2026-06-01' && day <= '2026-06-02')");
        expect(positionBodies[0]).not.toContain('.mutations(');
    });

    it('shows the mean proportion of each mutation', async () => {
        stubRhydb();
        const screen = renderOverTime();

        // Over both days: C241T 2700/3000, C3037T 300/3000.
        const firstRow = screen.getByRole('row').filter({ hasText: 'C241T' });
        await expect.element(firstRow.getByRole('cell', { name: '90.0%' })).toBeInTheDocument();
        const secondRow = screen.getByRole('row').filter({ hasText: 'C3037T' });
        await expect.element(secondRow.getByRole('cell', { name: '10.0%' })).toBeInTheDocument();
    });

    it('sorts all the mutations, not just those of the page, by the column whose header is clicked', async () => {
        stubRhydb();
        // One mutation per page, so the one shown is the first in the order.
        const screen = renderOverTime({ pageSizes: [1], jaccardIndices: { C241T: 0.1, C3037T: 0.7 } });

        // By Jaccard index, highest first, until a header is clicked.
        await expect.element(screen.getByText('C3037T').first()).toBeInTheDocument();
        await expect.element(screen.getByText('C241T').first()).not.toBeInTheDocument();

        await screen.getByRole('button', { name: 'Mutation' }).click();
        await expect.element(screen.getByText('C241T').first()).toBeInTheDocument();
        await expect.element(screen.getByText('C3037T').first()).not.toBeInTheDocument();

        await screen.getByRole('button', { name: 'Mutation' }).click();
        await expect.element(screen.getByText('C3037T').first()).toBeInTheDocument();
        await expect.element(screen.getByText('C241T').first()).not.toBeInTheDocument();

        await screen.getByRole('button', { name: 'Mean proportion' }).click();
        await expect.element(screen.getByText('C241T').first()).toBeInTheDocument();

        await screen.getByRole('button', { name: 'Mean proportion' }).click();
        await expect.element(screen.getByText('C3037T').first()).toBeInTheDocument();

        await screen.getByRole('button', { name: 'Jaccard index' }).click();
        await expect.element(screen.getByText('C3037T').first()).toBeInTheDocument();

        await screen.getByRole('button', { name: 'Jaccard index' }).click();
        await expect.element(screen.getByText('C241T').first()).toBeInTheDocument();
    });

    it('sorts by position by default without Jaccard indices', async () => {
        stubRhydb();
        const screen = renderOverTime({ pageSizes: [1] });

        await expect.element(screen.getByText('C241T').first()).toBeInTheDocument();
        await expect.element(screen.getByText('C3037T').first()).not.toBeInTheDocument();
    });

    it('shows a dash for a display mutation without a measured mean proportion', async () => {
        stubRhydb();
        // No read covers C5T.
        const screen = renderOverTime({ displayMutations: ['C5T', 'C241T', 'C3037T'] });

        const row = screen.getByRole('row').filter({ hasText: 'C5T' });
        await expect.element(row.getByRole('cell', { name: '–', exact: true })).toBeInTheDocument();
    });
});
