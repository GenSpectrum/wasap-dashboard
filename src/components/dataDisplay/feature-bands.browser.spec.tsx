import { describe, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { DEFAULT_BAND_VIEW_SETTINGS } from './band-view-settings';
import { FeatureBands, type FeatureBandsProps } from './feature-bands';
import { DEFAULT_FEATURE_SORT } from './featureSort';
import { serializeTemporal, type ProportionValue } from './overTime/proportionValue';
import { PageSizeContextProvider } from './tanstackTable/pagination-context';
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
        <PageSizeContextProvider pageSizes={[10]}>
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
                    renderTooltip: (value) => <span>{value}</span>,
                }}
                tooltipPortalTarget={null}
                pageSizes={[10]}
                pageIndex={0}
                totalRows={2}
                onPageChange={() => undefined}
                meanProportions={{ 'S:A1T': 0.15, 'S:C2G': 0.35 }}
                sort={DEFAULT_FEATURE_SORT}
                onSortChange={() => undefined}
                {...props}
            />
        </PageSizeContextProvider>,
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
        const { container, getByText } = renderBands({ data, requestedDateRanges: threeDates, totalRows: 1 });

        await expect.element(getByText('S:A1T')).toBeVisible();
        expect(container.querySelectorAll('[data-no-coverage]')).toHaveLength(1);
        const outline = container.querySelector('tbody svg path')!.getAttribute('d')!;
        expect(outline.match(/M/g)).toHaveLength(2); // one stretch of band either side of the gap
    });

    it('neither hatches nor draws a band in a bucket without any reads', async () => {
        const data = new Map2dBase<string, Temporal, ProportionValue>((key) => key, serializeTemporal);
        data.set('S:A1T', dates[0], valueOf(10));
        data.set('S:A1T', dates[1], null);
        const { container, getByText } = renderBands({ data, totalRows: 1 });

        await expect.element(getByText('S:A1T')).toBeVisible();
        expect(container.querySelectorAll('[data-no-coverage]')).toHaveLength(0);
        expect(container.querySelector('tbody svg path')!.getAttribute('d')!.match(/M/g)).toHaveLength(1);
    });

    it('does not print the percentages by default', async () => {
        const { getByText } = renderBands();

        await expect.element(getByText('10%')).not.toBeInTheDocument();
    });

    it('prints the percentage of every bucket over the band when asked to', async () => {
        // In the data, every bucket has a coverage of 100, so the count is the percentage.
        const { getByText } = renderBands({ viewSettings: { ...DEFAULT_BAND_VIEW_SETTINGS, showPercentages: true } });

        await expect.element(getByText('10%')).toBeInTheDocument();
        await expect.element(getByText('20%')).toBeInTheDocument();
        await expect.element(getByText('30%')).toBeInTheDocument();
        await expect.element(getByText('40%')).toBeInTheDocument();
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
        const { getByRole, getByText } = renderBands({
            jaccardIndices: { 'S:A1T': 0.912, 'S:C2G': 0.5 },
        });

        await expect.element(getByText('Jaccard index')).toBeVisible();

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
});
