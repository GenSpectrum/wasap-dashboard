import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    allRowsOf,
    cooccurrenceTableData,
    isAnyOf,
    type AmpliconRows,
    type CooccurrenceRow,
} from '../../../dataLayer/hooks/ampliconCooccurrence';
import { Map2dView } from '../../../util/map2d';
import { type Temporal, type TemporalClass } from '../../../util/temporalClass';
import { useBandViewSettings } from '../band-view-settings';
import { type FeatureRenderer, type RowStyle } from '../feature-bands';
import { DEFAULT_FEATURE_SORT, sortRowLabels } from '../featureSort';
import { HoverTooltip } from '../hover-tooltip';
import { OverTimeGrid, proportionsByDate, useOverTimeGridState } from '../over-time-grid';
import { type ProportionValue } from '../overTime/proportionValue';
import { getFilteredQueryOverTimeData, getMeanProportions } from '../queriesOverTime/getFilteredQueriesOverTimeData';

type TableProps = {
    /** Per amplicon, its rows; the row of all of its mutations is the amplicon's row in the table. */
    amplicons: AmpliconRows[];
    /** The date axis the rows' values are index-aligned with. */
    dateRanges: TemporalClass[];
    jaccardIndices: Partial<Record<string, number>> | undefined;
    /** The row of all the mutations is greyed out below it: it is only there to compare the others to. */
    minJaccard: number;
};

const PAGE_SIZES = [20, 50, 100, 250];

/** How far a row is indented, by how deep it is in its amplicon's tree. */
const LEVEL_INDENT = ['', 'pl-5', 'pl-10'];

/** A row of the table and the rows it opens up to. */
type TreeNode = { row: CooccurrenceRow; children: TreeNode[] };

/**
 * An amplicon's rows as a tree: the row of all of its mutations opens up to the others, and the
 * rows of any `k` of the mutations open up further, to the clusters of `k` of them.
 */
function treeOf({ all, anyOf, observed, singles }: AmpliconRows): TreeNode {
    const leaf = (row: CooccurrenceRow): TreeNode => ({ row, children: [] });
    return {
        row: all,
        children: [
            ...anyOf.map(({ row, clusters }) => ({ row, children: clusters.map(leaf) })),
            ...observed.map(leaf),
            ...singles.map(leaf),
        ],
    };
}

/** A row on the table: how deep it is in its amplicon's tree, and whether it opens up to others. */
type ShownRow = { row: CooccurrenceRow; level: number; isOpenable: boolean };

/** A node and, where it is open, the nodes below it, in the order of the table. */
function shownRows(node: TreeNode, openLabels: ReadonlySet<string>, level = 0): ShownRow[] {
    return [
        { row: node.row, level, isOpenable: node.children.length > 0 },
        ...(openLabels.has(node.row.label)
            ? node.children.flatMap((child) => shownRows(child, openLabels, level + 1))
            : []),
    ];
}

/**
 * Co-occurrence rows (`cooccurrenceRows`) as feature bands, like the queries over time: per
 * cluster, the share of the reads spanning its amplicon's mutations that carry at least its
 * mutations. A row per amplicon, of all of its mutations, which opens up to its other rows below
 * it. The sort and the pages go by the amplicons' rows, so an amplicon's rows stay under it.
 */
export function CooccurrenceTable({ amplicons, dateRanges, jaccardIndices, minJaccard }: TableProps) {
    const gridState = useOverTimeGridState(PAGE_SIZES);
    const [{ showEmptyDates }] = useBandViewSettings();
    // The labels of the rows opened up: of amplicons, and of any `k` of their mutations.
    const [openLabels, setOpenLabels] = useState<ReadonlySet<string>>(new Set());
    const toggle = useCallback(
        (label: string) =>
            setOpenLabels((open) => {
                const next = new Set(open);
                if (!next.delete(label)) {
                    next.add(label);
                }
                return next;
            }),
        [],
    );

    const rows = useMemo(() => amplicons.flatMap(allRowsOf), [amplicons]);
    const trees = useMemo(() => amplicons.map(treeOf), [amplicons]);
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
    const sortValues = useMemo(() => ({ meanProportions, jaccardIndices }), [meanProportions, jaccardIndices]);
    const sortedTrees = useMemo(() => {
        const treeByLabel = new Map(trees.map((tree) => [tree.row.label, tree]));
        return sortRowLabels([...treeByLabel.keys()], sort, sortValues).map((label) => treeByLabel.get(label)!);
    }, [trees, sort, sortValues]);
    const { setPageIndex, pageOf } = gridState;
    useEffect(() => setPageIndex(0), [filteredData, setPageIndex]);

    // The amplicons of the page, each with the rows it is opened up to below it.
    const pageBlocks = useMemo(
        () => pageOf(sortedTrees).map((tree) => shownRows(tree, openLabels)),
        [sortedTrees, pageOf, openLabels],
    );
    const pageData = useMemo(() => {
        const page = new Map2dView(filteredData);
        page.selectRows(pageBlocks.flat().map(({ row }) => row.label));
        return page;
    }, [filteredData, pageBlocks]);
    const shownByLabel = useMemo(
        () => new Map(pageBlocks.flat().map((shown) => [shown.row.label, shown])),
        [pageBlocks],
    );
    const rowByLabel = useMemo(() => new Map(rows.map((row) => [row.label, row])), [rows]);

    const renderer = useMemo<FeatureRenderer<string>>(
        () => ({
            asString: (label) => label,
            renderRowLabel: (label) => {
                const shown = shownByLabel.get(label);
                return shown === undefined ? (
                    <div className='mr-2'>{label}</div>
                ) : (
                    <RowLabel
                        {...shown}
                        isOpen={openLabels.has(label)}
                        onToggle={() => toggle(label)}
                        belowMinJaccard={
                            shown.level === 0 &&
                            jaccardIndices !== undefined &&
                            (jaccardIndices[label] ?? 0) < minJaccard
                        }
                    />
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
                                carry {isAnyOf(row) ? `at least ${row.atLeast} of` : 'all'} {row.cluster.length}{' '}
                                mutations of the cluster.
                            </span>
                        </p>
                    )
                );
            },
        }),
        [shownByLabel, rowByLabel, jaccardIndices, minJaccard, openLabels, toggle],
    );

    const rowStyle = useMemo(() => {
        // An opened amplicon's rows are set apart by thicker lines above and below them.
        const classNameByLabel = new Map<string, string>();
        for (const block of pageBlocks.filter((shown) => shown.length > 1)) {
            classNameByLabel.set(block[0].row.label, OPEN_BLOCK_TOP);
            classNameByLabel.set(block[block.length - 1].row.label, OPEN_BLOCK_BOTTOM);
        }
        return (label: string): RowStyle => ({
            className: classNameByLabel.get(label),
            cellClassNames:
                (jaccardIndices?.[label] ?? 1) < LOW_JACCARD
                    ? { jaccardIndex: LOW_JACCARD_CELLS, band: LOW_JACCARD_CELLS }
                    : undefined,
        });
    }, [pageBlocks, jaccardIndices]);

    return (
        <OverTimeGrid
            state={gridState}
            rowLabelHeader='Amplicon'
            data={pageData}
            isLoading={false}
            loadingRowLabels={[]}
            requestedDateRanges={filteredData.getSecondAxisKeys()}
            featureRenderer={renderer}
            totalRows={sortedTrees.length}
            csv={{
                filename: 'amplicon_cooccurrence.csv',
                getRows: () => getDownloadData(filteredData, rowByLabel, jaccardIndices),
            }}
            meanProportions={meanProportions}
            jaccardIndices={jaccardIndices}
            rowStyle={rowStyle}
            sort={sort}
        />
    );
}

/**
 * The label of a row: an amplicon's, or one of the rows it opens up to, indented by how deep it is.
 * One that opens up to others is a button with a chevron; the others leave its room blank, so the
 * rows line up.
 */
function RowLabel({
    row,
    level,
    isOpenable,
    isOpen,
    onToggle,
    belowMinJaccard,
}: ShownRow & { isOpen: boolean; onToggle: () => void; belowMinJaccard: boolean }) {
    const label = (
        <div
            className={`flex min-w-60 items-center justify-start gap-1.5 text-left ${LEVEL_INDENT[level]} ${belowMinJaccard ? 'opacity-40' : ''}`}
        >
            <span
                className={`iconify text-lg text-gray-500 ${isOpenable ? '' : 'invisible'} ${isOpen ? 'mdi--chevron-down' : 'mdi--chevron-right'}`}
            />
            {level === 0 ? <span>Amplicon {row.amplicon.number}</span> : <ClusterName row={row} />}
            <ClusterSizeBadge row={row} />
        </div>
    );
    const content = isSingle(row) ? (
        label
    ) : (
        <HoverTooltip
            content={<RowLabelTooltip row={row} />}
            placement='right'
            focusable={!isOpenable}
            className='w-full'
        >
            {label}
        </HoverTooltip>
    );
    return isOpenable ? (
        <button type='button' className='mr-2 block w-full cursor-pointer' aria-expanded={isOpen} onClick={onToggle}>
            {content}
        </button>
    ) : (
        <div className='mr-2 w-full'>{content}</div>
    );
}

/**
 * Below this Jaccard index, a row's Jaccard index and band are on a grey background, to tell it is
 * little specific to the variant.
 */
const LOW_JACCARD = 0.3;
const LOW_JACCARD_CELLS = 'bg-stone-200';

const OPEN_BLOCK_TOP = 'border-t-2 border-t-stone-400';
const OPEN_BLOCK_BOTTOM = 'border-b-2 border-b-stone-400';

/** The row's mutations: a single one's label has it already. */
function RowLabelTooltip({ row }: { row: CooccurrenceRow }) {
    return <div className='max-w-96 font-mono text-sm'>{row.cluster.map((mutation) => mutation.code).join(' + ')}</div>;
}

/** Whether the row is that of a single mutation, rather than of a cluster of them. */
function isSingle(row: CooccurrenceRow) {
    return !isAnyOf(row) && row.cluster.length === 1;
}

/**
 * How many of its amplicon's mutations a cluster has, `3/4`, or any of, `≥3/4`: amber where it is
 * not all of them, so the incomplete clusters stand out from the complete ones. None for a single
 * mutation, which its name says all about.
 */
function ClusterSizeBadge({ row }: { row: CooccurrenceRow }) {
    if (isSingle(row)) {
        return null;
    }
    const complete = !isAnyOf(row) && row.cluster.length === row.mutations.length;
    return (
        <span
            className={`px-1 text-xs font-medium whitespace-nowrap ${complete ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-800'}`}
            title={complete ? "All of the amplicon's mutations" : "Not all of the amplicon's mutations"}
        >
            {isAnyOf(row) && '≥'}
            {row.atLeast}/{row.mutations.length}
        </span>
    );
}

/** At most this many mutation codes in a row label; the tooltip has all of them. */
const MAX_CODES_IN_LABEL = 3;

/**
 * What a cluster is of its amplicon's mutations, in short: any n, or which, by the mutations it has
 * or those it is without, whichever are fewer.
 */
function ClusterName({ row }: { row: CooccurrenceRow }) {
    if (isAnyOf(row)) {
        return <span>Any {row.atLeast}</span>;
    }
    const left = row.mutations.filter((mutation) => !row.cluster.includes(mutation));
    return left.length < row.cluster.length ? (
        <span className='whitespace-nowrap'>
            Without <MutationCodes mutations={left} separator=', ' />
        </span>
    ) : (
        <MutationCodes mutations={row.cluster} separator=' + ' />
    );
}

function MutationCodes({ mutations, separator }: { mutations: CooccurrenceRow['cluster']; separator: string }) {
    const shown = mutations.slice(0, MAX_CODES_IN_LABEL).map((mutation) => mutation.code);
    const more = mutations.length - shown.length;
    return (
        <span className='font-mono whitespace-nowrap'>
            {shown.join(separator)}
            {more > 0 && <span className='font-sans text-gray-600'> and {more} more</span>}
        </span>
    );
}

function getDownloadData(
    data: Map2dView<string, Temporal, ProportionValue>,
    rowByLabel: Map<string, CooccurrenceRow>,
    jaccardIndices: Partial<Record<string, number>> | undefined,
) {
    return data.getFirstAxisKeys().map((label) => {
        const row = rowByLabel.get(label)!;
        return {
            amplicon: row.amplicon.number,
            cluster: row.cluster.map((mutation) => mutation.code).join(' '),
            atLeast: row.atLeast,
            ampliconMutations: row.mutations.map((mutation) => mutation.code).join(' '),
            jaccardIndex: jaccardIndices?.[label] ?? '',
            ...proportionsByDate(data, label),
        };
    });
}
