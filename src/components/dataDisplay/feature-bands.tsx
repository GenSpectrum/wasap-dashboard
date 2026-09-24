import { getCoreRowModel } from '@tanstack/table-core';
import { Fragment, useId, useMemo, type Dispatch, type ReactElement, type ReactNode, type SetStateAction } from 'react';

import { type BandViewSettings } from './band-view-settings';
import { getColorWithinScale } from './color-scale-selector';
import { nextSort, type FeatureSort, type SortColumn } from './featureSort';
import { formatProportion } from './formatProportion';
import { type TemporalDataMap } from './mutationsOverTime/MutationOverTimeData';
import PortalTooltip from './portal-tooltip';
import { Pagination, type PageSizes } from './tanstackTable/pagination';
import { usePageSizeContext } from './tanstackTable/pagination-context';
import { useReactTable } from './tanstackTable/tanstackTable';
import { type TooltipPosition } from './tooltip';
import { getProportion, type ProportionValue } from '../../query/queryMutationsOverTime';
import { type Temporal } from '../../util/temporalClass';

export interface FeatureRenderer<D> {
    asString(value: D): string;
    renderRowLabel(value: D): ReactElement;
    renderTooltip(value: D, temporal: Temporal, proportionValue: ProportionValue): ReactElement;
}

/**
 * Picks which side of a cell the tooltip should open on, so it stays within the visible bands
 * instead of overflowing off the top/bottom or left/right edge (meaning the tooltip tends to
 * open towards the 'center' of the component).
 */
function getTooltipPosition(rowIndex: number, rows: number, columnIndex: number, columns: number): TooltipPosition {
    const tooltipX = rowIndex < rows / 2 || rowIndex < 6 ? 'bottom' : 'top';
    const tooltipY = columnIndex < columns / 2 ? 'start' : 'end';
    return `${tooltipX}-${tooltipY}`;
}

/**
 * The feature x time-bucket matrix (mutations, or queries) drawn as one band per feature.
 *
 * A plain grid cell says what share of the reads carried a feature but not how many
 * reads that was, so one read in four and a thousand in four thousand look the same.
 * Here each row is a band along the time axis whose thickness at a bucket is the reads
 * covering it and whose fill is the proportion measured in them, so a share of a
 * handful of reads is a thread and a deeply read bucket is wide whatever was found in it.
 *
 * Ported from the design in wastewater-analytics-experiment (MutationViolins.tsx), which
 * also has a legend and column windowing that are not here yet.
 */

/** Half the thickness, in pixels, of the band at its thickest bucket. */
const COVERAGE_BAND_MAX_HALF = 15;
/** A covered bucket never thins away to nothing, or it can't be told from an uncovered one. */
const COVERAGE_BAND_MIN_HALF = 1.5;
/** Room for the thickest band, with a little air above and below it. */
const ROW_HEIGHT = COVERAGE_BAND_MAX_HALF * 2 + 6;
/** The band is drawn in a stretched space, so x is an arbitrary round number. */
const SPAN = 1000;
/** Black text stays readable on the dark parts of a band, and the light parts, with a white outline. */
const PERCENTAGE_OUTLINE = ['-1px 0', '1px 0', '0 -1px', '0 1px', '-1px -1px', '1px -1px', '-1px 1px', '1px 1px']
    .map((offset) => `${offset} 0 white`)
    .join(', ');
/** Width, in screen pixels, of the white gap that separates two buckets. */
const BUCKET_GAP = 1;

function coverageHalfThickness(coverage: number, maxCoverage: number): number {
    if (coverage <= 0 || maxCoverage <= 0) {
        return 0;
    }
    const share = Math.log10(coverage + 1) / Math.log10(maxCoverage + 1);
    return Math.max(COVERAGE_BAND_MIN_HALF, Math.min(1, share) * COVERAGE_BAND_MAX_HALF);
}

function coverageOf(value: ProportionValue): number {
    return value?.type === 'valueWithCoverage' ? value.coverage : 0;
}

export interface FeatureBandsProps<F> {
    rowLabelHeader: string;
    data: TemporalDataMap<F> | null;
    isLoading: boolean;
    loadingRowLabels: string[];
    requestedDateRanges: Temporal[];
    viewSettings: BandViewSettings;
    featureRenderer: FeatureRenderer<F>;
    tooltipPortalTarget: HTMLElement | null;
    pageSizes: PageSizes;
    /** Controlled page index (0-based). */
    pageIndex: number;
    /** Total number of rows across all pages. */
    totalRows: number;
    onPageChange: Dispatch<SetStateAction<number>>;
    /** Shown at the very right of the pagination row below the bands, e.g. a download button. */
    paginationEnd?: ReactNode;
    /**
     * The proportion of each row over the whole time range, by row label (see `FeatureRenderer.asString`).
     * A row without one (nothing measured it) shows a dash.
     */
    meanProportions: Partial<Record<string, number>>;
    /**
     * The Jaccard index of each row, by row label (see `FeatureRenderer.asString`). Without it,
     * there is no Jaccard index column.
     */
    jaccardIndices?: Partial<Record<string, number>>;
    /** How the rows are sorted, shown in the headers. The rows have to be given in this order already. */
    sort: FeatureSort;
    /** Called with the new sort when a header is clicked. */
    onSortChange: (sort: FeatureSort) => void;
}

export function FeatureBands<F>({
    rowLabelHeader,
    data,
    isLoading,
    loadingRowLabels,
    requestedDateRanges,
    viewSettings,
    featureRenderer,
    tooltipPortalTarget,
    pageSizes,
    pageIndex,
    totalRows,
    onPageChange,
    paginationEnd,
    meanProportions,
    jaccardIndices,
    sort,
    onSortChange,
}: FeatureBandsProps<F>) {
    const columns = data?.getSecondAxisKeys() ?? requestedDateRanges;
    const features = useMemo(() => data?.getFirstAxisKeys() ?? [], [data]);
    const rows = useMemo(() => data?.getAsArray() ?? [], [data]);
    const gradientPrefix = useId();
    const numberOfValueColumns = jaccardIndices === undefined ? 1 : 2;

    // A table instance with no columns of its own: it exists only to drive the
    // shared `Pagination` control the same way the grid tab's table does - the
    // rows it's given are just for `Pagination` to read a correct row count off.
    const { pageSize, setPageSize } = usePageSizeContext();
    const paginationTable = useReactTable({
        data: features,
        columns: [],
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: Math.ceil(totalRows / pageSize),
        state: { pagination: { pageIndex, pageSize } },
        onPaginationChange: (updater) => {
            const current = { pageIndex, pageSize };
            const next = typeof updater === 'function' ? updater(current) : updater;
            if (next.pageIndex !== current.pageIndex) {
                onPageChange(next.pageIndex);
            }
            if (next.pageSize !== current.pageSize) {
                setPageSize(next.pageSize);
            }
        },
    });

    // TODO: This is the largest coverage on the current page only, not of all the rows, so the
    // thickness of a band changes when the page (or the page size) changes. It has to be the same
    // for every page, e.g. the largest total number of sequences of any date bucket (no coverage
    // can exceed that), or the largest coverage over all the rows, not just the loaded ones.
    const maxCoverage = useMemo(
        () =>
            rows.reduce((max, row) => row.reduce((rowMax, cell) => Math.max(rowMax, coverageOf(cell ?? null)), max), 0),
        [rows],
    );

    return (
        <div className='w-full'>
            <div className='overflow-auto'>
                {/* All the date buckets live inside one table column (a flex row in the
                    header, a band per row), instead of one table column per bucket:
                    browsers disagree on how to size dozens of empty auto-width columns
                    (Firefox gives each one a sliver and leaves the rest of the table
                    unused). The label and value columns are as wide as their content
                    (`w-px` + no wrapping), and the date column, being `w-full`, gets
                    all the rest. */}
                <table className='w-full'>
                    <thead>
                        <tr>
                            <SortableHeader column='rowLabel' sort={sort} onSortChange={onSortChange}>
                                {rowLabelHeader}
                            </SortableHeader>
                            <SortableHeader column='meanProportion' sort={sort} onSortChange={onSortChange}>
                                Mean proportion
                            </SortableHeader>
                            {jaccardIndices !== undefined && (
                                <SortableHeader column='jaccardIndex' sort={sort} onSortChange={onSortChange}>
                                    Jaccard index
                                </SortableHeader>
                            )}
                            <th className='w-full p-0'>
                                {/* One equally wide slot per bucket, like the band's own
                                    hover columns, so a label sits above its bucket. */}
                                <div className='flex'>
                                    {columns.map((column, index) => (
                                        <div key={column.dateString} className='@container min-w-0 flex-1'>
                                            <DateHeaderLabel
                                                label={column.dateString}
                                                index={index}
                                                numberOfColumns={columns.length}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading
                            ? loadingRowLabels.map((label, rowIndex) => (
                                  <tr key={label}>
                                      <td className='text-center'>{label}</td>
                                      {rowIndex === 0 && (
                                          <td
                                              rowSpan={loadingRowLabels.length}
                                              colSpan={numberOfValueColumns + 1}
                                              className='text-center'
                                          >
                                              <span className='loading loading-spinner loading-sm' />
                                          </td>
                                      )}
                                  </tr>
                              ))
                            : features.map((feature, rowIndex) => (
                                  <tr key={featureRenderer.asString(feature)}>
                                      <th className='px-2 font-medium whitespace-nowrap'>
                                          {featureRenderer.renderRowLabel(feature)}
                                      </th>
                                      <td className='px-2 text-center whitespace-nowrap'>
                                          {formatMeanProportion(meanProportions[featureRenderer.asString(feature)])}
                                      </td>
                                      {jaccardIndices !== undefined && (
                                          <td className='px-2 text-center whitespace-nowrap'>
                                              {formatJaccardIndex(jaccardIndices[featureRenderer.asString(feature)])}
                                          </td>
                                      )}
                                      <td className='p-0'>
                                          <BandRow
                                              feature={feature}
                                              values={rows[rowIndex] ?? []}
                                              columns={columns}
                                              viewSettings={viewSettings}
                                              maxCoverage={maxCoverage}
                                              gradientId={`${gradientPrefix}-${rowIndex}`}
                                              rowIndex={rowIndex}
                                              numberOfRows={features.length}
                                              featureRenderer={featureRenderer}
                                              tooltipPortalTarget={tooltipPortalTarget}
                                          />
                                      </td>
                                  </tr>
                              ))}
                        {!isLoading && features.length === 0 && (
                            <tr>
                                <td colSpan={numberOfValueColumns + 2}>
                                    <div className='text-center'>No data available for your filters.</div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className='mt-2'>
                <Pagination
                    table={paginationTable}
                    pageSizes={pageSizes}
                    totalRows={totalRows}
                    endContent={paginationEnd}
                />
            </div>
        </div>
    );
}

/**
 * The header of a column the rows can be sorted by: clicking it sorts by the column, or reverses
 * the order if they already are. The arrow shows the direction they are sorted in, or, faded, the
 * one a click would sort them in.
 */
function SortableHeader({
    column,
    sort,
    onSortChange,
    children,
}: {
    column: SortColumn;
    sort: FeatureSort;
    onSortChange: (sort: FeatureSort) => void;
    children: ReactNode;
}) {
    const isSorted = sort.column === column;
    const shownDirection = isSorted ? sort.direction : nextSort(sort, column).direction;
    return (
        <th className='w-px px-2 whitespace-nowrap' aria-sort={isSorted ? sort.direction : 'none'}>
            <button
                type='button'
                className='inline-flex cursor-pointer items-center gap-1 font-bold'
                onClick={() => onSortChange(nextSort(sort, column))}
            >
                {children}
                <span aria-hidden='true' className={isSorted ? '' : 'opacity-25'}>
                    {shownDirection === 'ascending' ? '▲' : '▼'}
                </span>
            </button>
        </th>
    );
}

/** What a value column shows for a row without a value. */
const NO_VALUE = '–';

function formatMeanProportion(meanProportion: number | undefined) {
    return meanProportion === undefined ? NO_VALUE : formatProportion(meanProportion, 1);
}

/** Like `.95`: the index is never above 1, so the leading zero says nothing and is left off. */
function formatJaccardIndex(jaccardIndex: number | undefined) {
    return jaccardIndex === undefined ? NO_VALUE : jaccardIndex.toPrecision(2).replace(/^0\./, '.');
}

/**
 * The label of one bucket above the bands. Only the first and last are always shown,
 * the ones in between only when their slot is wide enough for the date, so the
 * labels never run into each other. They are centred over their bucket, except when
 * the slot is too narrow for the date: then the first starts at the left edge of the
 * bands and the last ends at the right edge, and both reach over their neighbours.
 */
function DateHeaderLabel({ label, index, numberOfColumns }: { label: string; index: number; numberOfColumns: number }) {
    if (index === 0) {
        return <p className='overflow-visible text-nowrap'>{label}</p>;
    }
    if (index === numberOfColumns - 1) {
        return (
            <div className='flex justify-end @[6rem]:justify-center'>
                <p className='shrink-0 text-nowrap'>{label}</p>
            </div>
        );
    }
    return <p className='invisible overflow-hidden text-nowrap @[6rem]:visible'>{label}</p>;
}

/** One mutation's band across the loaded date columns. */
function BandRow<F>({
    feature,
    values,
    columns,
    viewSettings,
    maxCoverage,
    gradientId,
    rowIndex,
    numberOfRows,
    featureRenderer,
    tooltipPortalTarget,
}: {
    feature: F;
    values: (ProportionValue | undefined)[];
    columns: Temporal[];
    viewSettings: BandViewSettings;
    maxCoverage: number;
    gradientId: string;
    rowIndex: number;
    numberOfRows: number;
    featureRenderer: FeatureRenderer<F>;
    tooltipPortalTarget: HTMLElement | null;
}) {
    const width = SPAN / columns.length;
    const centre = ROW_HEIGHT / 2;

    // A bucket is measured at the middle of its column, and the band is drawn
    // from nothing at either edge of the row, as a violin tapers.
    const knots = [
        { x: 0, half: 0 },
        ...columns.map((_, index) => ({
            x: (index + 0.5) * width,
            half: coverageHalfThickness(coverageOf(values[index] ?? null), maxCoverage),
        })),
        { x: SPAN, half: 0 },
    ];

    return (
        <div className='border-base-200 relative border-b' style={{ height: `${ROW_HEIGHT}px` }}>
            <svg
                className='absolute inset-0 h-full w-full'
                viewBox={`0 0 ${SPAN} ${ROW_HEIGHT}`}
                preserveAspectRatio='none'
                aria-hidden='true'
            >
                <defs>
                    {/* Hard stops, one slice per bucket: the colour of a bucket is
                        the proportion measured in it, and nothing is measured
                        between two buckets. */}
                    <linearGradient id={gradientId} gradientUnits='userSpaceOnUse' x1={0} x2={SPAN}>
                        {columns.map((column, index) => {
                            const value = values[index] ?? null;
                            const color = getColorWithinScale(getProportion(value), viewSettings.colorScale);
                            return (
                                <Fragment key={column.dateString}>
                                    <stop offset={index / columns.length} stopColor={color} />
                                    <stop offset={(index + 1) / columns.length} stopColor={color} />
                                </Fragment>
                            );
                        })}
                    </linearGradient>
                </defs>
                <path
                    d={bandPath(knots, centre)}
                    fill={`url(#${gradientId})`}
                    stroke='rgba(0, 0, 0, 0.3)'
                    strokeWidth={1}
                    vectorEffect='non-scaling-stroke'
                />
                {columns.slice(1).map((column, index) => (
                    <line
                        key={column.dateString}
                        x1={(index + 1) * width}
                        x2={(index + 1) * width}
                        y1={0}
                        y2={ROW_HEIGHT}
                        stroke='white'
                        strokeWidth={BUCKET_GAP}
                        vectorEffect='non-scaling-stroke'
                    />
                ))}
            </svg>

            <div className='absolute inset-0 flex'>
                {columns.map((column, index) => {
                    const value = values[index] ?? null;
                    const proportion = getProportion(value);
                    const tooltip = featureRenderer.renderTooltip(feature, column, value);
                    return (
                        // PortalTooltip's own wrapper div isn't a flex item itself, so
                        // give it one to stretch into - otherwise it collapses to the
                        // width of its (empty) content and there's nothing to hover.
                        <div key={column.dateString} className='flex-1'>
                            <PortalTooltip
                                content={tooltip}
                                position={getTooltipPosition(rowIndex, numberOfRows, index, columns.length)}
                                portalTarget={tooltipPortalTarget}
                            >
                                <div
                                    className='@container flex cursor-default items-center justify-center'
                                    style={{ height: `${ROW_HEIGHT}px` }}
                                >
                                    {viewSettings.showPercentages && proportion !== undefined && (
                                        <span
                                            className='invisible text-xs font-medium text-black @[2rem]:visible'
                                            style={{ textShadow: PERCENTAGE_OUTLINE }}
                                        >
                                            {formatProportion(proportion, 0)}
                                        </span>
                                    )}
                                </div>
                            </PortalTooltip>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * The outline of a band through its knots, mirrored about the centre line.
 *
 * Each segment is a cubic whose control points sit at the height of the knots
 * it joins, so the curve is smooth and never rises above the thicker of the
 * two: a bulge between two buckets would be coverage that was never measured.
 */
function bandPath(knots: { x: number; half: number }[], centre: number): string {
    const edge = (sign: number, reversed: boolean) => {
        const points = reversed ? [...knots].reverse() : knots;
        return points
            .map((knot, index) => {
                const y = centre + sign * knot.half;
                if (index === 0) {
                    return `${reversed ? 'L' : 'M'} ${knot.x} ${y}`;
                }
                const previous = points[index - 1];
                const handle = (knot.x - previous.x) / 3;
                return `C ${previous.x + handle} ${centre + sign * previous.half} ${knot.x - handle} ${y} ${knot.x} ${y}`;
            })
            .join(' ');
    };
    return `${edge(-1, false)} ${edge(1, true)} Z`;
}
