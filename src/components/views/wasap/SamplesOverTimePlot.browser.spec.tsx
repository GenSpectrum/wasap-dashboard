import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

import { SamplesOverTimeGrid } from './SamplesOverTimePlot';
import type { SampleOverview } from '../../../dataLayer/queries';

function sample(overrides: Partial<SampleOverview>): SampleOverview {
    return {
        locationName: 'Basel (BS)',
        date: '2024-01-10',
        sampleId: 'A1',
        batchId: 'B1',
        reads: 10,
        ...overrides,
    };
}

describe('SamplesOverTimeGrid', () => {
    it('renders a row per location and a column per date', async () => {
        const { getByText } = render(
            <SamplesOverTimeGrid
                samples={[
                    sample({ locationName: 'Basel (BS)', date: '2024-01-10' }),
                    sample({ locationName: 'Zürich (ZH)', date: '2024-01-12' }),
                ]}
            />,
        );

        await expect.element(getByText('Basel (BS)')).toBeVisible();
        await expect.element(getByText('Zürich (ZH)')).toBeVisible();
        await expect.element(getByText('2024-01-10', { exact: true })).toBeVisible();
        await expect.element(getByText('2024-01-12', { exact: true })).toBeVisible();
    });

    it('renders nothing when there are no samples', () => {
        const { container } = render(<SamplesOverTimeGrid samples={[]} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('colours every sample of the same batch alike, and different batches differently', async () => {
        const { container } = render(
            <SamplesOverTimeGrid
                samples={[
                    sample({ locationName: 'Basel (BS)', date: '2024-01-10', sampleId: 'A1', batchId: 'B1' }),
                    sample({ locationName: 'Basel (BS)', date: '2024-01-11', sampleId: 'A2', batchId: 'B1' }),
                    sample({ locationName: 'Basel (BS)', date: '2024-01-12', sampleId: 'A3', batchId: 'B2' }),
                ]}
            />,
        );

        const cellOf = (title: string) => container.querySelector(`[title^="${title}"]`)!;
        const colorA1 = getComputedStyle(cellOf('A1')).backgroundColor;
        const colorA2 = getComputedStyle(cellOf('A2')).backgroundColor;
        const colorA3 = getComputedStyle(cellOf('A3')).backgroundColor;

        expect(colorA1).toBe(colorA2);
        expect(colorA1).not.toBe(colorA3);
    });

    it('shades a cell more faintly the fewer reads its sample has', async () => {
        const { container } = render(
            <SamplesOverTimeGrid
                samples={[
                    sample({ locationName: 'Basel (BS)', date: '2024-01-10', sampleId: 'LOW', reads: 1000 }),
                    sample({ locationName: 'Chur (GR)', date: '2024-01-10', sampleId: 'MID', reads: 50_000 }),
                    sample({ locationName: 'Genève (GE)', date: '2024-01-10', sampleId: 'HIGH', reads: 1_000_000 }),
                ]}
            />,
        );

        const alphaOf = (title: string) => {
            const bg = getComputedStyle(container.querySelector(`[title^="${title}"]`)!).backgroundColor;
            const match = /rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/.exec(bg);
            return match ? Number(match[1]) : 1;
        };

        expect(alphaOf('LOW')).toBeLessThan(alphaOf('MID'));
        expect(alphaOf('MID')).toBeLessThan(alphaOf('HIGH'));
    });

    it('marks a location with no sample on a date that another location does have', async () => {
        const { container } = render(
            <SamplesOverTimeGrid
                samples={[
                    sample({ locationName: 'Basel (BS)', date: '2024-01-10', sampleId: 'A1' }),
                    sample({ locationName: 'Zürich (ZH)', date: '2024-01-12', sampleId: 'Z1' }),
                ]}
            />,
        );

        const absent = container.querySelector('[title$=": no sample"]');
        expect(absent).not.toBeNull();
        expect(absent!.getAttribute('title')).toBe('Basel (BS), 2024-01-12: no sample');
    });

    it('shows the legend, including the batch-colour explanation', async () => {
        const { getByText } = render(<SamplesOverTimeGrid samples={[sample({})]} />);

        await expect.element(getByText('Samples of the same batch have the same colour.')).toBeVisible();
        await expect.element(getByText('no sample')).toBeVisible();
    });
});
