import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { cooccurrenceTableData, type CooccurrenceRow } from '../../../dataLayer/hooks/ampliconCooccurrence';
import { Map2dView } from '../../../util/map2d';
import { type Temporal, type TemporalClass, toTemporalClass } from '../../../util/temporalClass';
import { useBandViewSettings } from '../band-view-settings';
import { CsvDownloadButton } from '../csv-download-button';
import { FeatureBands, type FeatureRenderer } from '../feature-bands';
import { DEFAULT_FEATURE_SORT, sortRowLabels, type FeatureSort } from '../featureSort';
import { OverTimeGridTooltip } from '../over-time-grid-tooltip';
import { getProportion, type ProportionValue } from '../overTime/proportionValue';
import PortalTooltip from '../portal-tooltip';
import { getFilteredQueryOverTimeData, getMeanProportions } from '../queriesOverTime/getFilteredQueriesOverTimeData';
import { type PageSizes } from '../tanstackTable/pagination';
import { PageSizeContextProvider, usePageSizeContext } from '../tanstackTable/pagination-context';
import { ViewSettingsControls } from '../view-settings-controls';

type TableProps = {
    rows: CooccurrenceRow[];
    /** The date axis the rows' values are index-aligned with. */
    dateRanges: TemporalClass[];
    jaccardIndices: Partial<Record<string, number>> | undefined;
    pageSizes: PageSizes;
};

/**
 * The co-occurrence rows (`cooccurrenceRows`) as feature bands, like the queries over time: per
 * cluster, the share of the reads spanning its amplicon's mutations that carry at least its
 * mutations.
 */
export function AmpliconCooccurrenceTable(props: TableProps) {
    return (
        <PageSizeContextProvider pageSizes={props.pageSizes}>
            <Table {...props} />
        </PageSizeContextProvider>
    );
}

function Table({ rows, dateRanges, jaccardIndices, pageSizes }: TableProps) {
    const [tooltipPortalTarget, setTooltipPortalTarget] = useState<HTMLDivElement | null>(null);
    const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null);
    useLayoutEffect(() => setTooltipPortalTarget(wrapper), [wrapper]);

    const { pageSize } = usePageSizeContext();
    const [pageIndex, setPageIndex] = useState(0);
    // By amplicon (the rows' order), unlike the mutations over time, which go by Jaccard index first.
    const [sort, setSort] = useState(DEFAULT_FEATURE_SORT);
    const [viewSettings, setViewSettings] = useBandViewSettings();
    const { showEmptyDates } = viewSettings;

    const data = useMemo(() => cooccurrenceTableData(rows, dateRanges), [rows, dateRanges]);
    const meanProportions = useMemo(() => getMeanProportions(data), [data]);
    const filteredData = useMemo(
        () =>
            getFilteredQueryOverTimeData({
                data,
                meanProportions,
                proportionInterval: { min: 0, max: 1 },
                showEmptyDates,
            }),
        [data, meanProportions, showEmptyDates],
    );
    // A sort by Jaccard index without any falls back.
    const effectiveSort = sort.column === 'jaccardIndex' && jaccardIndices === undefined ? DEFAULT_FEATURE_SORT : sort;
    const sortedLabels = useMemo(
        () => sortRowLabels(filteredData.getFirstAxisKeys(), effectiveSort, { meanProportions, jaccardIndices }),
        [filteredData, effectiveSort, meanProportions, jaccardIndices],
    );
    useEffect(() => setPageIndex(0), [filteredData]);

    const changeSort = (newSort: FeatureSort) => {
        setSort(newSort);
        setPageIndex(0);
    };

    const rowByLabel = useMemo(() => new Map(rows.map((row) => [row.label, row])), [rows]);
    const renderer = useMemo<FeatureRenderer<string>>(
        () => ({
            asString: (label) => label,
            renderRowLabel: (label) => {
                const row = rowByLabel.get(label);
                return (
                    <PortalTooltip
                        content={row ? <RowLabelTooltip row={row} /> : label}
                        position='right'
                        portalTarget={tooltipPortalTarget}
                    >
                        {row ? (
                            <div className='mr-2 flex items-center gap-1.5 text-left'>
                                Amplicon {row.amplicon.number}
                                <ClusterSizeBadge row={row} />
                            </div>
                        ) : (
                            <div className='mr-2'>{label}</div>
                        )}
                    </PortalTooltip>
                );
            },
            renderTooltip: (label, temporal, value) => {
                const row = rowByLabel.get(label);
                return (
                    <OverTimeGridTooltip
                        label={<span className='font-bold'>{label}</span>}
                        date={temporal}
                        value={value}
                    >
                        {row && value?.type === 'value' && (
                            <p className='mt-2'>
                                {value.count.toLocaleString()}{' '}
                                <span className='text-gray-600'>
                                    of the {value.coverage.toLocaleString()} reads spanning the amplicon&apos;s
                                    mutations carry all {row.cluster.length} mutations of the cluster.
                                </span>
                            </p>
                        )}
                        {value?.type === 'noCoverage' && (
                            <p className='mt-2 text-gray-600'>
                                No read spans the mutations (the amplicon dropped out?).
                            </p>
                        )}
                    </OverTimeGridTooltip>
                );
            },
        }),
        [rowByLabel, tooltipPortalTarget],
    );

    const pageData = useMemo(() => {
        const page = new Map2dView(filteredData);
        page.selectRows(sortedLabels.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize));
        return page;
    }, [filteredData, sortedLabels, pageIndex, pageSize]);

    return (
        <div ref={setWrapper} className='border border-stone-300 bg-white'>
            <FeatureBands
                rowLabelHeader='Amplicon'
                data={pageData}
                isLoading={false}
                loadingRowLabels={[]}
                requestedDateRanges={filteredData.getSecondAxisKeys()}
                viewSettings={viewSettings}
                featureRenderer={renderer}
                tooltipPortalTarget={tooltipPortalTarget}
                pageSizes={pageSizes}
                pageIndex={pageIndex}
                totalRows={sortedLabels.length}
                onPageChange={setPageIndex}
                paginationStart={<ViewSettingsControls settings={viewSettings} onChange={setViewSettings} />}
                paginationEnd={
                    <CsvDownloadButton
                        className='btn btn-xs'
                        label='Download CSV'
                        getData={() => getDownloadData(filteredData, rowByLabel, jaccardIndices)}
                        filename='amplicon_cooccurrence.csv'
                    />
                }
                meanProportions={meanProportions}
                jaccardIndices={jaccardIndices}
                sort={effectiveSort}
                onSortChange={changeSort}
            />
        </div>
    );
}

function RowLabelTooltip({ row }: { row: CooccurrenceRow }) {
    const { amplicon, mutations, cluster } = row;
    const others = mutations.filter((mutation) => !cluster.includes(mutation));
    return (
        <div className='max-w-96 space-y-1'>
            <div className='font-bold'>
                {cluster.length} of the {mutations.length} mutations in amplicon {amplicon.number}, together
            </div>
            <div className='text-gray-600'>
                Insert {amplicon.insertStart.toLocaleString()}–{amplicon.insertEnd.toLocaleString()}, pool{' '}
                {amplicon.pool}
            </div>
            <div className='font-mono text-sm'>{cluster.map((mutation) => mutation.code).join(' + ')}</div>
            {others.length > 0 && (
                <div className='text-gray-600'>
                    Not part of it:{' '}
                    <span className='font-mono'>{others.map((mutation) => mutation.code).join(', ')}</span>
                </div>
            )}
            <div className='text-gray-600'>
                The share of the reads with a call at all of the amplicon&apos;s mutation positions that carry at least
                these mutations. The Jaccard index is that of the variant and the clinical sequences with all of them.
            </div>
        </div>
    );
}

/**
 * How many of its amplicon's mutations a cluster has, `3/4`: amber where it is not all of them, so
 * the incomplete clusters stand out from the complete ones.
 */
function ClusterSizeBadge({ row }: { row: CooccurrenceRow }) {
    const complete = row.cluster.length === row.mutations.length;
    return (
        <span
            className={`px-1 text-xs font-medium ${complete ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-800'}`}
            title={complete ? "All of the amplicon's mutations" : "Not all of the amplicon's mutations"}
        >
            {row.cluster.length}/{row.mutations.length}
        </span>
    );
}

function getDownloadData(
    data: Map2dView<string, Temporal, ProportionValue>,
    rowByLabel: Map<string, CooccurrenceRow>,
    jaccardIndices: Partial<Record<string, number>> | undefined,
) {
    const dates = data.getSecondAxisKeys().map((date) => toTemporalClass(date));
    return data.getFirstAxisKeys().map((label) => {
        const row = rowByLabel.get(label);
        return {
            amplicon: row?.amplicon.number ?? '',
            cluster: row?.cluster.map((mutation) => mutation.code).join(' ') ?? '',
            ampliconMutations: row?.mutations.map((mutation) => mutation.code).join(' ') ?? '',
            jaccardIndex: jaccardIndices?.[label] ?? '',
            ...Object.fromEntries(
                dates.map((date) => [date.dateString, getProportion(data.get(label, date) ?? null) ?? '']),
            ),
        };
    });
}
