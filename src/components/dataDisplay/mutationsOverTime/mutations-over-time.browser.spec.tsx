import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { MutationsOverTime } from './mutations-over-time';
import { ConnectionProvider } from '../../../dataLayer/hooks/connection';
import type { SiloSchema } from '../../../dataLayer/queries/schema';
import { MutationAnnotationsContextProvider } from '../../MutationAnnotationsContext';

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
 * Routes the three SILO queries the component sends to canned NDJSON:
 *  - the date axis (`groupBy({n := count()}, {date})`) -> two day buckets
 *  - the metadata `mutations(minProportion := 0.001, …)` call -> the two
 *    display mutations, each above the floor
 *  - one position-over-time query (`map({sym := main.at(P)}).groupBy({count := count()}, {date, sym})`)
 *    per distinct position -> a symbol distribution per day, so every cell resolves
 *
 * Position 241: alt `T` = 90% of coverage in both buckets.
 * Position 3037: alt `T` = 10% of coverage in both buckets.
 */
function stubSilo() {
    const fetchMock = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
        const q = typeof init?.body === 'string' ? init.body : '';

        if (q.includes('main.at(241)')) {
            return Promise.resolve(
                ndjson([
                    { date: '2026-06-01', sym: 'T', count: 900 },
                    { date: '2026-06-01', sym: 'C', count: 100 },
                    { date: '2026-06-02', sym: 'T', count: 1800 },
                    { date: '2026-06-02', sym: 'C', count: 200 },
                ]),
            );
        }
        if (q.includes('main.at(3037)')) {
            return Promise.resolve(
                ndjson([
                    { date: '2026-06-01', sym: 'T', count: 100 },
                    { date: '2026-06-01', sym: 'C', count: 900 },
                    { date: '2026-06-02', sym: 'T', count: 200 },
                    { date: '2026-06-02', sym: 'C', count: 1800 },
                ]),
            );
        }
        if (q.includes('.mutations(') || q.includes('.aminoAcidMutations(')) {
            return Promise.resolve(
                ndjson([
                    {
                        mutationFrom: 'C',
                        mutationTo: 'T',
                        sequenceName: 'main',
                        position: 241,
                        count: 900,
                        coverage: 1000,
                    },
                    {
                        mutationFrom: 'C',
                        mutationTo: 'T',
                        sequenceName: 'main',
                        position: 3037,
                        count: 100,
                        coverage: 1000,
                    },
                ]),
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

function renderOverTime() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ConnectionProvider url='https://silo.example.org/covid' schema={schema}>
                <MutationAnnotationsContextProvider value={[]}>
                    <MutationsOverTime
                        width='100%'
                        filter={{ samplingDateFrom: '2026-06-01', samplingDateTo: '2026-06-02' }}
                        sequenceType='nucleotide'
                        granularity='day'
                        displayMutations={['C241T', 'C3037T']}
                        meanProportionInterval={{ min: 0, max: 1 }}
                        pageSizes={[10, 20]}
                    />
                </MutationAnnotationsContextProvider>
            </ConnectionProvider>
        </QueryClientProvider>,
    );
}

afterEach(() => vi.unstubAllGlobals());

describe('MutationsOverTime (SILO position-over-time)', () => {
    it('renders a row per display mutation, and the first and last date bucket', async () => {
        stubSilo();
        const screen = renderOverTime();

        await expect.element(screen.getByText('2026-06-01').first()).toBeInTheDocument();
        await expect.element(screen.getByText('2026-06-02').first()).toBeInTheDocument();

        await expect.element(screen.getByText('C241T').first()).toBeInTheDocument();
        await expect.element(screen.getByText('C3037T').first()).toBeInTheDocument();
    });

    it('prints the proportions, alt / coverage, over the bands once asked to in the view settings', async () => {
        stubSilo();
        const screen = renderOverTime();

        await expect.element(screen.getByText('C241T').first()).toBeInTheDocument();
        await expect.element(screen.getByText('90%').first()).not.toBeInTheDocument();

        await screen.getByRole('button', { name: 'View settings' }).click();
        await screen.getByRole('checkbox', { name: 'Show percentages' }).click();

        // C241T: 900/1000 in every bucket; C3037T: 100/1000.
        await expect.element(screen.getByText('90%').first()).toBeInTheDocument();
        await expect.element(screen.getByText('10%').first()).toBeInTheDocument();
    });

    it('sends one position query per distinct position, location-scoped, no date bounds', async () => {
        const fetchMock = stubSilo();
        renderOverTime();

        const positionBodies = () =>
            fetchMock.mock.calls
                .map(([, init]) => (typeof init?.body === 'string' ? init.body : ''))
                .filter((body) => body.includes('sym := main.at('));

        await vi.waitFor(() => expect(positionBodies()).toHaveLength(2));

        expect(positionBodies()).toEqual([
            'default.map({sym := main.at(241)}).groupBy({count := count()}, {date, sym})',
            'default.map({sym := main.at(3037)}).groupBy({count := count()}, {date, sym})',
        ]);
    });
});
