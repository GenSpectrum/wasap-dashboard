import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { TextFilter } from './text-filter';
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

function ndjson(rows: unknown[]): Response {
    return new Response(rows.map((row) => JSON.stringify(row)).join('\n'), {
        status: 200,
        headers: { 'content-type': 'application/x-ndjson', 'data-version': '1750000000' },
    });
}

function renderFilter(ui: ReactElement) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ConnectionProvider url='https://silo.example.org/covid' schema={schema}>
                {ui}
            </ConnectionProvider>
        </QueryClientProvider>,
    );
}

afterEach(() => vi.unstubAllGlobals());

describe('TextFilter', () => {
    it('lists the SILO string-field options and emits the field value on select', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                ndjson([
                    { locationName: 'Zürich (ZH)', n: 30 },
                    { locationName: 'Basel (BS)', n: 10 },
                ]),
            ),
        );

        const onInputChange = vi.fn();
        const screen = renderFilter(
            <TextFilter
                field='locationName'
                width='100%'
                placeholderText='Sampling location'
                onInputChange={onInputChange}
            />,
        );

        await screen.getByPlaceholder('Sampling location').click();

        await expect.element(screen.getByText('Basel (BS)')).toBeInTheDocument();
        await screen.getByText('Basel (BS)').click();

        expect(onInputChange).toHaveBeenLastCalledWith({ locationName: 'Basel (BS)' });
    });
});
