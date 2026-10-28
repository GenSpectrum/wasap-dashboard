import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { afterEach, describe, expect, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { DatasetFilterPanel } from './DatasetFilterPanel';
import { ConnectionProvider } from '../../dataLayer/hooks/connection';
import type { RhydbSchema } from '../../dataLayer/queries/schema';
import type { DatasetFilter } from '../../pageState/analysisFilter';
import { it } from '../../test/test-extend';

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

const DEFAULT_LOCATION = 'Zürich (ZH)';

const dataset: DatasetFilter = {
    locationNames: [DEFAULT_LOCATION],
    samplingDate: { label: 'Custom', dateFrom: '2024-01-01', dateTo: '2024-12-31' },
    granularity: 'day',
};

function Harness({ onChange }: { onChange: (value: DatasetFilter) => void }) {
    const [value, setValue] = useState(dataset);

    return (
        <DatasetFilterPanel
            value={value}
            onChange={(newValue) => {
                onChange(newValue);
                setValue(newValue);
            }}
        />
    );
}

/** With the locations in RhyDB's column `locationColumn`, which needn't be named like the URL param. */
function renderPanel(onChange = vi.fn(), locationColumn = schema.locationName) {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() =>
            Promise.resolve(
                new Response(
                    [
                        { [locationColumn]: DEFAULT_LOCATION, n: 30 },
                        { [locationColumn]: 'Basel (BS)', n: 10 },
                        { [locationColumn]: 'Bern (BE)', n: 20 },
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
            <ConnectionProvider
                url='https://rhydb.example.org/covid'
                schema={{ ...schema, locationName: locationColumn }}
            >
                <Harness onChange={onChange} />
            </ConnectionProvider>
        </QueryClientProvider>,
    );
}

afterEach(() => vi.unstubAllGlobals());

describe('DatasetFilterPanel', () => {
    it("offers the locations of RhyDB's location column, not of the URL param's name", async () => {
        const { getByRole } = renderPanel(vi.fn(), 'city');

        await getByRole('button', { name: DEFAULT_LOCATION }).click();
        await expect.element(getByRole('checkbox', { name: 'Basel (BS)' })).toBeVisible();
        const queries = vi.mocked(fetch).mock.calls.map(([, init]) => init?.body);
        expect(queries).toContain('data.group(by := {city}, aggs := {n := count()})');
    });

    it('applies the ticked locations when the dropdown is closed', async () => {
        const onChange = vi.fn();
        const { getByRole } = renderPanel(onChange);

        await getByRole('button', { name: DEFAULT_LOCATION }).click();
        await expect.element(getByRole('checkbox', { name: DEFAULT_LOCATION })).toBeChecked();
        await getByRole('checkbox', { name: 'Bern (BE)' }).click();
        await getByRole('checkbox', { name: 'Basel (BS)' }).click();
        await expect.element(getByRole('checkbox', { name: 'Basel (BS)' })).toBeChecked();
        expect(onChange).not.toHaveBeenCalled();

        await getByRole('button', { name: /Basel \(BS\), Bern \(BE\)/ }).click();

        // Once, and in the order of the options, not of the clicks.
        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange).toHaveBeenLastCalledWith({
            ...dataset,
            locationNames: ['Basel (BS)', 'Bern (BE)', DEFAULT_LOCATION],
        });
        await expect.element(getByRole('checkbox', { name: 'Basel (BS)' })).not.toBeInTheDocument();
    });

    it('applies the ticks on Escape and on a click outside', async () => {
        const onChange = vi.fn();
        const { getByRole, getByText } = renderPanel(onChange);

        await getByRole('button', { name: DEFAULT_LOCATION }).click();
        await getByRole('checkbox', { name: 'Basel (BS)' }).click();
        await userEvent.keyboard('{Escape}');
        expect(onChange).toHaveBeenLastCalledWith({ ...dataset, locationNames: ['Basel (BS)', DEFAULT_LOCATION] });
        await expect.element(getByRole('button', { name: /Basel \(BS\)/ })).toHaveFocus();

        await getByRole('button', { name: /Basel \(BS\)/ }).click();
        await getByRole('checkbox', { name: 'Basel (BS)' }).click();
        await getByText('Granularity').click();
        expect(onChange).toHaveBeenLastCalledWith({ ...dataset, locationNames: [DEFAULT_LOCATION] });
    });

    it('applies nothing when the ticks are as they were', async () => {
        const onChange = vi.fn();
        const { getByRole } = renderPanel(onChange);

        await getByRole('button', { name: DEFAULT_LOCATION }).click();
        await getByRole('checkbox', { name: 'Basel (BS)' }).click();
        await getByRole('checkbox', { name: 'Basel (BS)' }).click();
        await userEvent.keyboard('{Escape}');

        expect(onChange).not.toHaveBeenCalled();
    });

    it('clears the selection, which shows as all locations', async () => {
        const onChange = vi.fn();
        const { getByRole, getByText } = renderPanel(onChange);

        await getByRole('button', { name: DEFAULT_LOCATION }).click();
        await getByRole('button', { name: 'Clear' }).click();
        await expect.element(getByText('All locations')).toBeVisible();
        await expect.element(getByRole('checkbox', { name: DEFAULT_LOCATION })).not.toBeChecked();
        await userEvent.keyboard('{Escape}');

        expect(onChange).toHaveBeenLastCalledWith({ ...dataset, locationNames: [] });
    });
});
