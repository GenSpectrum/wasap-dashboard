import { useRef, type ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from 'vitest-browser-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextFilter } from './text-filter';
import { ConnectionProvider } from '../../data/connection';
import { gsEventNames } from '../../util/gsEventNames';
import type { SiloSchema } from '../../queries/schema';

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

/** Catches the bubbling gs-text-filter-changed event the way the src/ wrapper does. */
function EventCatcher({ onDetail, children }: { onDetail: (detail: unknown) => void; children: ReactElement }) {
    const ref = useRef<HTMLDivElement>(null);
    return (
        <div
            ref={(el) => {
                ref.current = el;
                el?.addEventListener(gsEventNames.textFilterChanged, (event) =>
                    onDetail((event as CustomEvent).detail),
                );
            }}
        >
            {children}
        </div>
    );
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

        const onDetail = vi.fn();
        const screen = renderFilter(
            <EventCatcher onDetail={onDetail}>
                <TextFilter field='locationName' width='100%' placeholderText='Sampling location' />
            </EventCatcher>,
        );

        await screen.getByPlaceholder('Sampling location').click();

        await expect.element(screen.getByText('Basel (BS)')).toBeInTheDocument();
        await screen.getByText('Basel (BS)').click();

        expect(onDetail).toHaveBeenLastCalledWith({ locationName: 'Basel (BS)' });
    });
});
