import { beforeAll, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

import { DeconvolutionPlot } from './DeconvolutionPlot';
import { UNDETERMINED, type DeconvolutionResult } from '../../../deconvolution/lollipopService';

const colors = new Map([
    ['A', '#ff0000'],
    ['B', '#00ff00'],
    ['C', '#0000ff'],
]);

/** A result for `lineages` and then "Undetermined", on two dates, with every lineage at the same share. */
function result(lineages: string[]): DeconvolutionResult {
    const variants = [...lineages, UNDETERMINED];
    const proportion = 1 / variants.length;
    return {
        variants,
        dates: ['2026-06-01', '2026-06-08'].map((date) => ({
            date,
            estimates: variants.map((variant) => ({ variant, proportion, lower: proportion, upper: proportion })),
        })),
    };
}

/** The fill colours of the confidence bands that are drawn: all of them, or only the highlighted lineage's. */
function bandColors(container: HTMLElement): string[] {
    return [...container.querySelectorAll('path[fill-opacity]')].map((band) => band.getAttribute('fill') ?? '');
}

// The specs run without Tailwind's CSS, and the plot only draws once its container has a size.
beforeAll(() => {
    const style = document.createElement('style');
    style.textContent = '.h-72 { height: 18rem; }';
    document.head.append(style);
});

describe('DeconvolutionPlot', () => {
    it('keeps the highlighted lineage when a new result has fewer lineages', async () => {
        const screen = render(
            <DeconvolutionPlot result={result(['A', 'B', 'C'])} colors={colors} granularity='week' />,
        );
        await screen.getByText('C', { exact: true }).hover();
        await expect.poll(() => bandColors(screen.container)).toEqual(['#0000ff']);

        screen.rerender(<DeconvolutionPlot result={result(['C'])} colors={colors} granularity='week' />);
        await expect.poll(() => bandColors(screen.container)).toEqual(['#0000ff']);
    });

    it('highlights nothing when the highlighted lineage is not in a new result', async () => {
        const screen = render(
            <DeconvolutionPlot result={result(['A', 'B', 'C'])} colors={colors} granularity='week' />,
        );
        await screen.getByText('C', { exact: true }).hover();
        await expect.poll(() => bandColors(screen.container)).toEqual(['#0000ff']);

        screen.rerender(<DeconvolutionPlot result={result(['A'])} colors={colors} granularity='week' />);
        await expect.poll(() => bandColors(screen.container)).toHaveLength(2);
    });
});
