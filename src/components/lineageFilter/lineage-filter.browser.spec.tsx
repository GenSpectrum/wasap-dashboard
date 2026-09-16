import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { LineageFilter } from './lineage-filter';
import { LapisClientProvider } from '../../externalData/lapis/LapisClientContext';

/** Stubs the two clinical-LAPIS calls the lineage picker makes. */
function stubLapis({ aggregated, lineageDefinition }: { aggregated: unknown; lineageDefinition: unknown }) {
    vi.stubGlobal(
        'fetch',
        vi.fn((input: RequestInfo | URL) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
            const body = url.includes('/sample/lineageDefinition/') ? lineageDefinition : { data: aggregated };
            return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
        }),
    );
}

function renderFilter(ui: ReactElement) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <LapisClientProvider url='https://lapis.clinical.example/open/v2'>{ui}</LapisClientProvider>
        </QueryClientProvider>,
    );
}

afterEach(() => vi.unstubAllGlobals());

describe('LineageFilter', () => {
    it('lists lineages (with wildcard forms) from clinical LAPIS and emits the field value on select', async () => {
        stubLapis({
            aggregated: [
                { nextcladePangoLineage: 'A', count: 5 },
                { nextcladePangoLineage: 'A.1', count: 3 },
            ],
            lineageDefinition: { A: {}, 'A.1': { parents: ['A'] } },
        });

        const onLineageChange = vi.fn();
        const screen = renderFilter(
            <LineageFilter
                field='nextcladePangoLineage'
                width='100%'
                value=''
                placeholderText='Variant'
                onLineageChange={onLineageChange}
            />,
        );

        await screen.getByPlaceholder('Variant').click();

        await expect.element(screen.getByText('A*')).toBeInTheDocument();
        await screen.getByText('A.1', { exact: true }).click();

        expect(onLineageChange).toHaveBeenLastCalledWith({ nextcladePangoLineage: 'A.1' });
    });
});
