import { describe, expect } from 'vitest';
import { render } from 'vitest-browser-react';

import { MutationBands, type MutationBandsProps } from './mutation-bands';
import { it } from '../../../test-extend';
import { serializeTemporal, type ProportionValue } from '../../query/queryMutationsOverTime';
import { Map2dBase } from '../../util/map2d';
import { type Temporal, TemporalCache } from '../../util/temporalClass';
import { PageSizeContextProvider } from '../shared/tanstackTable/pagination-context';

const dates: Temporal[] = [
    TemporalCache.getInstance().getYearMonthDay('2024-01-01'),
    TemporalCache.getInstance().getYearMonthDay('2024-01-02'),
];

function valueOf(count: number): ProportionValue {
    return { type: 'valueWithCoverage', count, coverage: 100, totalCount: 100 };
}

function someData() {
    const data = new Map2dBase<string, Temporal, ProportionValue>((key) => key, serializeTemporal);
    data.set('S:A1T', dates[0], valueOf(10));
    data.set('S:A1T', dates[1], valueOf(20));
    data.set('S:C2G', dates[0], valueOf(30));
    data.set('S:C2G', dates[1], valueOf(40));
    return data;
}

function renderBands(props: Partial<MutationBandsProps<string>> = {}) {
    return render(
        <PageSizeContextProvider pageSizes={[10]}>
            <MutationBands
                rowLabelHeader='Mutation'
                data={someData()}
                isLoading={false}
                loadingRowLabels={[]}
                requestedDateRanges={dates}
                colorScale={{ min: 0, max: 1, color: 'indigo' }}
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
                {...props}
            />
        </PageSizeContextProvider>,
    );
}

describe('MutationBands', () => {
    it('renders a row per feature, and the first and last date', async () => {
        const { getByText } = renderBands();

        await expect.element(getByText('S:A1T')).toBeVisible();
        await expect.element(getByText('S:C2G')).toBeVisible();
        await expect.element(getByText('2024-01-01')).toBeVisible();
        await expect.element(getByText('2024-01-02')).toBeVisible();
    });

    it('renders custom columns between the row label and the bands, with the value of each row', async () => {
        const { getByRole, getByText } = renderBands({
            customColumns: [{ header: 'Jaccard index', values: { 'S:A1T': '0.91', 'S:C2G': 0.5 } }],
        });

        await expect.element(getByText('Jaccard index')).toBeVisible();

        const firstRow = getByRole('row').filter({ hasText: 'S:A1T' });
        await expect.element(firstRow.getByRole('cell', { name: '0.91' })).toBeVisible();
        const secondRow = getByRole('row').filter({ hasText: 'S:C2G' });
        await expect.element(secondRow.getByRole('cell', { name: '0.5' })).toBeVisible();
    });

    it('renders no custom column header when there are none', async () => {
        const { getByText } = renderBands();

        await expect.element(getByText('Jaccard index')).not.toBeInTheDocument();
    });
});
