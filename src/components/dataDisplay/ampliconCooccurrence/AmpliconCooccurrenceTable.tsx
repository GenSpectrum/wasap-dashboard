import { useEffect, useMemo } from 'react';

import { cooccurrenceTableData, type CooccurrenceRow } from '../../../dataLayer/hooks/ampliconCooccurrence';
import { Map2dView } from '../../../util/map2d';
import { type Temporal, type TemporalClass } from '../../../util/temporalClass';
import { useBandViewSettings } from '../band-view-settings';
import { type FeatureRenderer } from '../feature-bands';
import { DEFAULT_FEATURE_SORT, sortRowLabels } from '../featureSort';
import { HoverTooltip } from '../hover-tooltip';
import { OverTimeGrid, proportionsByDate, useOverTimeGridState } from '../over-time-grid';
import { type ProportionValue } from '../overTime/proportionValue';
import { getFilteredQueryOverTimeData, getMeanProportions } from '../queriesOverTime/getFilteredQueriesOverTimeData';

type TableProps = {
    rows: CooccurrenceRow[];
    /** The date axis the rows' values are index-aligned with. */
    dateRanges: TemporalClass[];
    jaccardIndices: Partial<Record<string, number>> | undefined;
    pageSizes: number[];
};

/**
 * The co-occurrence rows (`cooccurrenceRows`) as feature bands, like the queries over time: per
 * cluster, the share of the reads spanning its amplicon's mutations that carry at least its
 * mutations.
 */
export function AmpliconCooccurrenceTable({ rows, dateRanges, jaccardIndices, pageSizes }: TableProps) {
    const gridState = useOverTimeGridState(pageSizes);
    const [{ showEmptyDates }] = useBandViewSettings();

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
    // By amplicon (the rows' order), unlike the mutations over time, which go by Jaccard index first.
    const sort = gridState.sortOr(DEFAULT_FEATURE_SORT, jaccardIndices !== undefined);
    const sortedLabels = useMemo(
        () => sortRowLabels(filteredData.getFirstAxisKeys(), sort, { meanProportions, jaccardIndices }),
        [filteredData, sort, meanProportions, jaccardIndices],
    );
    const { setPageIndex, pageOf } = gridState;
    useEffect(() => setPageIndex(0), [filteredData, setPageIndex]);

    const rowByLabel = useMemo(() => new Map(rows.map((row) => [row.label, row])), [rows]);
    const renderer = useMemo<FeatureRenderer<string>>(
        () => ({
            asString: (label) => label,
            renderRowLabel: (label) => {
                const row = rowByLabel.get(label);
                return (
                    <HoverTooltip content={row ? <RowLabelTooltip row={row} /> : label} placement='right' focusable>
                        {row ? (
                            <div className='mr-2 flex items-center gap-1.5 text-left'>
                                Amplicon {row.amplicon.number}
                                <ClusterSizeBadge row={row} />
                            </div>
                        ) : (
                            <div className='mr-2'>{label}</div>
                        )}
                    </HoverTooltip>
                );
            },
            describe: (label, value) => {
                const row = rowByLabel.get(label);
                if (value.type === 'noCoverage') {
                    return <p className='text-gray-600'>No read spans the mutations (the amplicon dropped out?).</p>;
                }
                return (
                    row && (
                        <p>
                            {value.count.toLocaleString()}{' '}
                            <span className='text-gray-600'>
                                of the {value.coverage.toLocaleString()} reads spanning the amplicon&apos;s mutations
                                carry all {row.cluster.length} mutations of the cluster.
                            </span>
                        </p>
                    )
                );
            },
        }),
        [rowByLabel],
    );

    const pageData = useMemo(() => {
        const page = new Map2dView(filteredData);
        page.selectRows(pageOf(sortedLabels));
        return page;
    }, [filteredData, sortedLabels, pageOf]);

    return (
        <OverTimeGrid
            state={gridState}
            rowLabelHeader='Amplicon'
            data={pageData}
            isLoading={false}
            loadingRowLabels={[]}
            requestedDateRanges={filteredData.getSecondAxisKeys()}
            featureRenderer={renderer}
            totalRows={sortedLabels.length}
            csv={{
                filename: 'amplicon_cooccurrence.csv',
                getRows: () => getDownloadData(filteredData, rowByLabel, jaccardIndices),
            }}
            meanProportions={meanProportions}
            jaccardIndices={jaccardIndices}
            sort={sort}
        />
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
    return data.getFirstAxisKeys().map((label) => {
        const row = rowByLabel.get(label);
        return {
            amplicon: row?.amplicon.number ?? '',
            cluster: row?.cluster.map((mutation) => mutation.code).join(' ') ?? '',
            ampliconMutations: row?.mutations.map((mutation) => mutation.code).join(' ') ?? '',
            jaccardIndex: jaccardIndices?.[label] ?? '',
            ...proportionsByDate(data, label),
        };
    });
}
