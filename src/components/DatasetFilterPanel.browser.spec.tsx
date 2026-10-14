import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { afterEach, describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { DatasetFilterPanel } from './DatasetFilterPanel';
import { it } from '../../test-extend';
import { ConnectionProvider } from '../dataLayer/hooks/connection';
import type { SiloSchema } from '../dataLayer/queries/schema';
import type { WasapDatasetFilter } from '../pageState/wasap/wasapAnalysisFilter';

const schema: SiloSchema = {
    table: 'data',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

const DEFAULT_LOCATION = 'Zürich (ZH)';

const dataset: WasapDatasetFilter = {
    locationNames: [DEFAULT_LOCATION],
    samplingDate: { label: 'Custom', dateFrom: '2024-01-01', dateTo: '2024-12-31' },
    granularity: 'day',
};

function Harness({ onChange }: { onChange: (value: WasapDatasetFilter) => void }) {
    const [value, setValue] = useState(dataset);

    return (
        <DatasetFilterPanel
            config={{ locationNameField: 'locationName' }}
            value={value}
            onChange={(newValue) => {
                onChange(newValue);
                setValue(newValue);
            }}
        />
    );
}

function renderPanel(onChange = vi.fn()) {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() =>
            Promise.resolve(
                new Response(
                    [
                        { locationName: DEFAULT_LOCATION, n: 30 },
                        { locationName: 'Basel (BS)', n: 10 },
                        { locationName: 'Bern (BE)', n: 20 },
                    ]
                        .map((row) => JSON.stringify(row))
                        .join('\n'),
                    {
                        status: 200,
                        headers: { 'content-type': 'application/x-ndjson', 'data-version': '1750000000' },
                    },
                ),
            ),
        ),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ConnectionProvider url='https://silo.example.org/covid' schema={schema}>
                <Harness onChange={onChange} />
            </ConnectionProvider>
        </QueryClientProvider>,
    );
}

afterEach(() => vi.unstubAllGlobals());

describe('DatasetFilterPanel', () => {
    it('shows the location, and adds a ticked one right away', async () => {
        const onChange = vi.fn();
        const { getByRole } = renderPanel(onChange);

        await getByRole('button', { name: DEFAULT_LOCATION }).click();
        await expect.element(getByRole('checkbox', { name: DEFAULT_LOCATION })).toBeChecked();
        await getByRole('checkbox', { name: 'Basel (BS)' }).click();

        // In the order of the options, not of the clicks.
        expect(onChange).toHaveBeenLastCalledWith({ ...dataset, locationNames: ['Basel (BS)', DEFAULT_LOCATION] });
        await expect.element(getByRole('checkbox', { name: 'Basel (BS)' })).toBeChecked();
    });

    it('unticks a location', async () => {
        const onChange = vi.fn();
        const { getByRole } = renderPanel(onChange);

        await getByRole('button', { name: DEFAULT_LOCATION }).click();
        await getByRole('checkbox', { name: DEFAULT_LOCATION }).click();

        expect(onChange).toHaveBeenLastCalledWith({ ...dataset, locationNames: [] });
    });

    it('clears the selection, which shows as all locations', async () => {
        const onChange = vi.fn();
        const { getByRole, getByText } = renderPanel(onChange);

        await getByRole('button', { name: DEFAULT_LOCATION }).click();
        await getByRole('button', { name: 'Clear' }).click();

        expect(onChange).toHaveBeenLastCalledWith({ ...dataset, locationNames: [] });
        await expect.element(getByText('All locations')).toBeVisible();
        await expect.element(getByRole('checkbox', { name: DEFAULT_LOCATION })).not.toBeChecked();
    });
});
