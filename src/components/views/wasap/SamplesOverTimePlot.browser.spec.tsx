import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

import { SamplesOverTimeGrid } from './SamplesOverTimePlot';
import type { SampleOverview } from '../../../dataLayer/queries';

// 2024-01-08 and 2024-01-15 are Mondays; 2024-01-10 (Wed) and 2024-01-12 (Fri) are not.
function sample(overrides: Partial<SampleOverview>): SampleOverview {
    return {
        locationName: 'Basel (BS)',
        date: '2024-01-08',
        sampleId: 'A1',
        batchId: 'B1',
        reads: 10,
        ...overrides,
    };
}

describe('SamplesOverTimeGrid', () => {
    it('renders a row per location and labels every Monday column', async () => {
        const { getByText } = render(
            <SamplesOverTimeGrid
                samples={[
                    sample({ locationName: 'Basel (BS)', date: '2024-01-08' }),
                    sample({ locationName: 'Zürich (ZH)', date: '2024-01-15' }),
                ]}
            />,
        );

        await expect.element(getByText('Basel (BS)')).toBeVisible();
        await expect.element(getByText('Zürich (ZH)')).toBeVisible();
        await expect.element(getByText('8 Jan', { exact: true })).toBeVisible();
        await expect.element(getByText('15 Jan', { exact: true })).toBeVisible();
    });

    it('does not label a date that is not a Monday', async () => {
        const { getByText } = render(<SamplesOverTimeGrid samples={[sample({ date: '2024-01-10' })]} />);

        await expect.element(getByText('10 Jan', { exact: true })).not.toBeInTheDocument();
    });

    it('renders nothing when there are no samples', () => {
        const { container } = render(<SamplesOverTimeGrid samples={[]} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('colours every sample of the same batch alike, and different batches differently', async () => {
        const { container } = render(
            <SamplesOverTimeGrid
                samples={[
                    sample({ locationName: 'Basel (BS)', date: '2024-01-08', sampleId: 'A1', batchId: 'B1' }),
                    sample({ locationName: 'Basel (BS)', date: '2024-01-09', sampleId: 'A2', batchId: 'B1' }),
                    sample({ locationName: 'Basel (BS)', date: '2024-01-10', sampleId: 'A3', batchId: 'B2' }),
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
                    sample({ locationName: 'Basel (BS)', date: '2024-01-08', sampleId: 'LOW', reads: 1000 }),
                    sample({ locationName: 'Chur (GR)', date: '2024-01-08', sampleId: 'MID', reads: 50_000 }),
                    sample({ locationName: 'Genève (GE)', date: '2024-01-08', sampleId: 'HIGH', reads: 1_000_000 }),
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
                    sample({ locationName: 'Basel (BS)', date: '2024-01-08', sampleId: 'A1' }),
                    sample({ locationName: 'Zürich (ZH)', date: '2024-01-09', sampleId: 'Z1' }),
                ]}
            />,
        );

        const absent = container.querySelector('[title$=": no sample"]');
        expect(absent).not.toBeNull();
        expect(absent!.getAttribute('title')).toBe('Basel (BS), 2024-01-09: no sample');
    });

    it('marks a Monday column, but not the days after it, with the thick week-divider class', async () => {
        // Asserts the class the app's Tailwind build turns into the thick border, rather than the
        // resulting border width itself: this component test doesn't load that compiled
        // stylesheet, only the app running for real does (confirmed there separately).
        const { container } = render(
            <SamplesOverTimeGrid
                samples={[
                    sample({ date: '2024-01-08', sampleId: 'MON' }),
                    sample({ date: '2024-01-09', sampleId: 'TUE' }),
                ]}
            />,
        );

        const cellOf = (title: string) => container.querySelector(`[title^="${title}"]`)!;

        expect(cellOf('MON').classList.contains('border-l-2')).toBe(true);
        expect(cellOf('TUE').classList.contains('border-l-2')).toBe(false);
    });

    it('shows the legend, including the batch-colour and week-line explanations', async () => {
        const { getByText } = render(<SamplesOverTimeGrid samples={[sample({})]} />);

        await expect.element(getByText('Samples of the same batch have the same colour.')).toBeVisible();
        await expect.element(getByText('A thick line marks the start of each week.')).toBeVisible();
        await expect.element(getByText('no sample')).toBeVisible();
    });
});
