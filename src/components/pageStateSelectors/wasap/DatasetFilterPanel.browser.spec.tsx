import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { afterEach, describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { DatasetFilterPanel } from './DatasetFilterPanel';
import { it } from '../../../../test-extend';
import { ConnectionProvider } from '../../../dataLayer/hooks/connection';
import type { SiloSchema } from '../../../dataLayer/queries/schema';
import type { WasapDatasetFilter } from '../../../pageState/wasap/wasapAnalysisFilter';

const schema: SiloSchema = {
    table: 'default',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
};

const DEFAULT_LOCATION = 'Zürich (ZH)';

const dataset: WasapDatasetFilter = {
    locationName: DEFAULT_LOCATION,
    samplingDate: { label: 'Custom', dateFrom: '2024-01-01', dateTo: '2024-12-31' },
    granularity: 'day',
    excludeEmpty: true,
};

/** Stands in for the URL: a filter without a location comes back with the default one, like when it is parsed. */
function Harness({ onChange }: { onChange: (value: WasapDatasetFilter) => void }) {
    const [value, setValue] = useState(dataset);

    return (
        <DatasetFilterPanel
            config={{ locationNameField: 'locationName' }}
            value={value}
            onChange={(newValue) => {
                onChange(newValue);
                setValue({ ...newValue, locationName: newValue.locationName ?? DEFAULT_LOCATION });
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
    it('shows the location, and applies a new one right away', async () => {
        const onChange = vi.fn();
        const { getByRole, getByText } = renderPanel(onChange);

        await expect.element(getByRole('combobox').first()).toHaveValue(DEFAULT_LOCATION);

        // The list is filtered by what is in the field, so type to find the other one.
        await getByRole('combobox').first().fill('Basel');
        await getByText('Basel (BS)').click();

        expect(onChange).toHaveBeenLastCalledWith({ ...dataset, locationName: 'Basel (BS)' });
    });

    it('leaves the location field empty when it is cleared, so that another one can be picked', async () => {
        const onChange = vi.fn();
        const { getByRole } = renderPanel(onChange);
        await expect.element(getByRole('combobox').first()).toHaveValue(DEFAULT_LOCATION);

        await getByRole('button', { name: 'clear selection' }).first().click();

        await expect.element(getByRole('combobox').first()).toHaveValue('');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('applies the location that is picked after the field was cleared', async () => {
        const onChange = vi.fn();
        const { getByRole, getByText } = renderPanel(onChange);
        await expect.element(getByRole('combobox').first()).toHaveValue(DEFAULT_LOCATION);
        await getByRole('button', { name: 'clear selection' }).first().click();

        await getByRole('combobox').first().click();
        await getByText('Basel (BS)').click();

        expect(onChange).toHaveBeenLastCalledWith({ ...dataset, locationName: 'Basel (BS)' });
        await expect.element(getByRole('combobox').first()).toHaveValue('Basel (BS)');
    });

    it('shows the same location again when it is picked after clearing the field', async () => {
        const { getByRole, getByText } = renderPanel();
        await expect.element(getByRole('combobox').first()).toHaveValue(DEFAULT_LOCATION);
        await getByRole('button', { name: 'clear selection' }).first().click();

        await getByRole('combobox').first().click();
        await getByText(DEFAULT_LOCATION).click();

        await expect.element(getByRole('combobox').first()).toHaveValue(DEFAULT_LOCATION);
    });
});
