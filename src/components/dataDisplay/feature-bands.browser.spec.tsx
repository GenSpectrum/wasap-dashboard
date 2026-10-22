import { describe, expect, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { DEFAULT_BAND_VIEW_SETTINGS } from './band-view-settings';
import { FeatureBands, type FeatureBandsProps } from './feature-bands';
import { DEFAULT_FEATURE_SORT } from './featureSort';
import { serializeTemporal, type ProportionValue } from './overTime/proportionValue';
import { it } from '../../../test-extend';
import { Map2dBase } from '../../util/map2d';
import { type Temporal, TemporalCache } from '../../util/temporalClass';

const dates: Temporal[] = [
    TemporalCache.getInstance().getYearMonthDay('2024-01-01'),
    TemporalCache.getInstance().getYearMonthDay('2024-01-02'),
];

function valueOf(count: number): ProportionValue {
    return { type: 'value', count, coverage: 100, totalCount: 100 };
}

function someData() {
    const data = new Map2dBase<string, Temporal, ProportionValue>((key) => key, serializeTemporal);
    data.set('S:A1T', dates[0], valueOf(10));
    data.set('S:A1T', dates[1], valueOf(20));
    data.set('S:C2G', dates[0], valueOf(30));
    data.set('S:C2G', dates[1], valueOf(40));
    return data;
}

function renderBands(props: Partial<FeatureBandsProps<string>> = {}) {
    return render(
        <FeatureBands
            rowLabelHeader='Mutation'
            data={someData()}
            isLoading={false}
            loadingRowLabels={[]}
            requestedDateRanges={dates}
            viewSettings={DEFAULT_BAND_VIEW_SETTINGS}
            featureRenderer={{
                asString: (value) => value,
                renderRowLabel: (value) => <span>{value}</span>,
                describe: (value) => <span>{value} described</span>,
            }}
            pagination={{
                pageIndex: 0,
                pageSize: 10,
                pageSizes: [10],
                totalRows: 2,
                onPageChange: () => undefined,
                onPageSizeChange: () => undefined,
            }}
            meanProportions={{ 'S:A1T': 0.15, 'S:C2G': 0.35 }}
            sort={DEFAULT_FEATURE_SORT}
            onSortChange={() => undefined}
            {...props}
        />,
    );
}

describe('FeatureBands', () => {
    it('renders a row per feature, and the first and last date', async () => {
        const { getByText } = renderBands();

        await expect.element(getByText('S:A1T')).toBeVisible();
        await expect.element(getByText('S:C2G')).toBeVisible();
        await expect.element(getByText('2024-01-01')).toBeVisible();
        await expect.element(getByText('2024-01-02')).toBeVisible();
    });

    it('keeps all date buckets in a single table column, whatever their number', async () => {
        // Sizing many tiny table columns is done differently by each browser: in Firefox the
        // bands were squeezed into a fraction of the table when each bucket was its own column.
        const { container } = renderBands();

        await expect.element(container.querySelector('table')!).toBeInTheDocument();
        expect(container.querySelectorAll('thead th')).toHaveLength(3); // row label + mean proportion + all dates
        expect(container.querySelectorAll('tbody tr:first-child > *')).toHaveLength(3);
    });

    it('hatches a bucket with reads but no coverage, and cuts the band off square around it', async () => {
        const threeDates = [...dates, TemporalCache.getInstance().getYearMonthDay('2024-01-03')];
        const data = new Map2dBase<string, Temporal, ProportionValue>((key) => key, serializeTemporal);
        data.set('S:A1T', threeDates[0], valueOf(10));
        data.set('S:A1T', threeDates[1], { type: 'noCoverage', totalCount: 100 });
        data.set('S:A1T', threeDates[2], valueOf(30));
        const { container, getByText } = renderBands({ data, requestedDateRanges: threeDates });

        await expect.element(getByText('S:A1T')).toBeVisible();
        expect(container.querySelectorAll('[data-no-coverage]')).toHaveLength(1);
        const outline = container.querySelector('tbody svg path')!.getAttribute('d')!;
        expect(outline.match(/M/g)).toHaveLength(2); // one stretch of band either side of the gap
    });

    it('neither hatches nor draws a band in a bucket without any reads', async () => {
        const data = new Map2dBase<string, Temporal, ProportionValue>((key) => key, serializeTemporal);
        data.set('S:A1T', dates[0], valueOf(10));
        data.set('S:A1T', dates[1], null);
        const { container, getByText } = renderBands({ data });

        await expect.element(getByText('S:A1T')).toBeVisible();
        expect(container.querySelectorAll('[data-no-coverage]')).toHaveLength(0);
        expect(container.querySelector('tbody svg path')!.getAttribute('d')!.match(/M/g)).toHaveLength(1);
    });

    it('does not print the percentages by default', async () => {
        const { getByRole } = renderBands();

        await expect.element(getByRole('table').getByText('10%')).not.toBeInTheDocument();
    });

    it('prints the percentage of every bucket over the band when asked to', async () => {
        // In the data, every bucket has a coverage of 100, so the count is the percentage.
        const { getByRole } = renderBands({ viewSettings: { ...DEFAULT_BAND_VIEW_SETTINGS, showPercentages: true } });

        const table = getByRole('table');
        await expect.element(table.getByText('10%')).toBeInTheDocument();
        await expect.element(table.getByText('20%')).toBeInTheDocument();
        await expect.element(table.getByText('30%')).toBeInTheDocument();
        await expect.element(table.getByText('40%')).toBeInTheDocument();
    });

    it('renders the mean proportion of each row between the row label and the bands', async () => {
        const { getByRole, getByText } = renderBands();

        await expect.element(getByText('Mean proportion')).toBeVisible();

        const firstRow = getByRole('row').filter({ hasText: 'S:A1T' });
        await expect.element(firstRow.getByRole('cell', { name: '15.0%' })).toBeVisible();
        const secondRow = getByRole('row').filter({ hasText: 'S:C2G' });
        await expect.element(secondRow.getByRole('cell', { name: '35.0%' })).toBeVisible();
    });

    it('renders a dash for a row without a mean proportion or Jaccard index', async () => {
        const { getByRole } = renderBands({ meanProportions: { 'S:A1T': 0.15 }, jaccardIndices: { 'S:A1T': 0.9 } });

        const rowWithout = getByRole('row').filter({ hasText: 'S:C2G' });
        await expect.poll(() => rowWithout.getByRole('cell', { name: '–', exact: true }).elements()).toHaveLength(2);
    });

    it('renders the Jaccard index of each row between the row label and the bands', async () => {
        const { getByRole } = renderBands({
            jaccardIndices: { 'S:A1T': 0.912, 'S:C2G': 0.5 },
        });

        await expect.element(getByRole('table').getByText('Jaccard index')).toBeVisible();

        const firstRow = getByRole('row').filter({ hasText: 'S:A1T' });
        await expect.element(firstRow.getByRole('cell', { name: '.91' })).toBeVisible();
        const secondRow = getByRole('row').filter({ hasText: 'S:C2G' });
        await expect.element(secondRow.getByRole('cell', { name: '.50' })).toBeVisible();
    });

    it('renders no Jaccard index column without Jaccard indices', async () => {
        const { getByText } = renderBands();

        await expect.element(getByText('Jaccard index')).not.toBeInTheDocument();
    });

    it('marks the column the rows are sorted by', async () => {
        const { getByRole } = renderBands({
            jaccardIndices: { 'S:A1T': 0.9 },
            sort: { column: 'meanProportion', direction: 'descending' },
        });

        const headerOf = (name: string) => getByRole('button', { name }).element().closest('th');

        await expect.element(getByRole('button', { name: 'Mean proportion' })).toBeVisible();
        expect(headerOf('Mean proportion')).toHaveAttribute('aria-sort', 'descending');
        expect(headerOf('Mutation')).toHaveAttribute('aria-sort', 'none');
        expect(headerOf('Jaccard index')).toHaveAttribute('aria-sort', 'none');
    });

    it('sorts by a column when its header is clicked, and reverses the order when clicked again', async () => {
        const onSortChange = vi.fn();
        const { getByRole } = renderBands({
            jaccardIndices: { 'S:A1T': 0.9 },
            sort: { column: 'jaccardIndex', direction: 'descending' },
            onSortChange,
        });

        await getByRole('button', { name: 'Mean proportion' }).click();
        expect(onSortChange).toHaveBeenLastCalledWith({ column: 'meanProportion', direction: 'descending' });

        await getByRole('button', { name: 'Jaccard index' }).click();
        expect(onSortChange).toHaveBeenLastCalledWith({ column: 'jaccardIndex', direction: 'ascending' });
    });

    it('shows the tooltip of the bucket under the mouse, and none once it leaves', async () => {
        const { container, getByRole } = renderBands();

        const cell = container.querySelector<HTMLElement>('[data-row="1"][data-column="0"]')!;
        await userEvent.hover(cell);
        const tooltip = getByRole('tooltip');
        await expect.element(tooltip).toHaveTextContent('S:C2G');
        await expect.element(tooltip).toHaveTextContent('30.00%');
        await expect.element(tooltip).toHaveTextContent('S:C2G described');

        await userEvent.hover(container.querySelector('thead')!);
        await expect.element(getByRole('tooltip')).not.toBeInTheDocument();
    });

    it('renders no tooltip for buckets that are not hovered', async () => {
        const { container, getByText } = renderBands();

        await expect.element(getByText('S:A1T')).toBeVisible();
        expect(container.ownerDocument.querySelectorAll('[role="tooltip"]')).toHaveLength(0);
        expect(container.textContent).not.toContain('described');
    });

    it('shows the legend only while the mouse is over the legend button', async () => {
        const { getByRole, getByTestId } = renderBands();

        await expect.element(getByTestId('feature-bands-legend')).not.toBeInTheDocument();
        await userEvent.hover(getByRole('button', { name: 'Legend' }));
        await expect.element(getByTestId('feature-bands-legend')).toBeVisible();
        await userEvent.unhover(getByRole('button', { name: 'Legend' }));
        await expect.element(getByTestId('feature-bands-legend')).not.toBeInTheDocument();
    });

    it('explains the colours, the thickness and the hatching of the bands', async () => {
        const { getByRole, getByTestId } = renderBands();

        await userEvent.hover(getByRole('button', { name: 'Legend' }));
        const legend = getByTestId('feature-bands-legend');
        await expect.element(legend).toHaveTextContent('Share of the covering reads');
        await expect.element(legend).toHaveTextContent('Covering reads (log scale)');
        await expect.element(legend).toHaveTextContent('Reads, but none covering');
        // Every bucket of the data is covered by 100 reads, the most on the page.
        await expect.element(legend.getByText('100', { exact: true })).toBeVisible();
        await expect.element(legend).not.toHaveTextContent('Jaccard index');
        await expect.element(legend).not.toHaveTextContent('No reads');
    });

    it('draws the colour key at the colour scale of the bands', async () => {
        const { getByRole, getByTestId } = renderBands({
            viewSettings: { ...DEFAULT_BAND_VIEW_SETTINGS, colorScale: { color: 'indigo', root: 1 } },
        });

        await userEvent.hover(getByRole('button', { name: 'Legend' }));
        const swatch = getByTestId('feature-bands-legend').getByText('50%').element().previousElementSibling!;
        expect((swatch as HTMLElement).style.backgroundColor).toMatch(/, 0\.5\)$/);
    });

    it('adds the Jaccard index shading and empty dates to the legend where the bands have them', async () => {
        const { getByRole, getByTestId } = renderBands({
            jaccardIndices: { 'S:A1T': 0.9, 'S:C2G': 0.5 },
            viewSettings: { ...DEFAULT_BAND_VIEW_SETTINGS, showEmptyDates: true },
        });

        await userEvent.hover(getByRole('button', { name: 'Legend' }));
        const legend = getByTestId('feature-bands-legend');
        await expect.element(legend).toHaveTextContent('Jaccard index');
        await expect.element(legend).toHaveTextContent('≥ .8');
        await expect.element(legend).toHaveTextContent('≥ .9');
        await expect.element(legend).toHaveTextContent('No reads');
    });

    it("adds the caller's keys to the Jaccard index section of the legend", async () => {
        const { getByRole, getByTestId } = renderBands({
            jaccardIndices: { 'S:A1T': 0.9, 'S:C2G': 0.5 },
            jaccardLegend: <span>greyed out</span>,
        });

        await userEvent.hover(getByRole('button', { name: 'Legend' }));
        await expect.element(getByTestId('feature-bands-legend')).toHaveTextContent('greyed out');
    });
});
