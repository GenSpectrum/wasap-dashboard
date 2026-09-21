import { getCoreRowModel } from '@tanstack/table-core';
import { Fragment, useId, useMemo, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import { type TemporalDataMap } from './MutationOverTimeData';
import { getProportion, type ProportionValue } from '../../query/queryMutationsOverTime';
import { type Temporal } from '../../util/temporalClass';
import { type ColorScale, getColorWithinScale } from '../shared/color-scale-selector';
import { type CustomColumn, type FeatureRenderer } from '../shared/features-over-time-grid';
import { getTooltipPosition } from '../shared/features-over-time-grid-shared';
import PortalTooltip from '../shared/portal-tooltip';
import { Pagination, type PageSizes } from '../shared/tanstackTable/pagination';
import { usePageSizeContext } from '../shared/tanstackTable/pagination-context';
import { useReactTable } from '../shared/tanstackTable/tanstackTable';

/**
 * Prototype: the mutation x time-bucket matrix drawn as one band per mutation,
 * instead of a grid of colour-scaled cells.
 *
 * A grid cell says what share of the reads carried a mutation but not how many
 * reads that was, so one read in four and a thousand in four thousand look the
 * same. Here each row is a band along the time axis whose thickness at a bucket
 * is the reads covering it and whose fill is the proportion measured in them,
 * so a share of a handful of reads is a thread and a deeply read bucket is wide
 * whatever was found in it.
 *
 * Spike scope: reuses whatever page of rows/dates the grid already fetched, and
 * the grid's own colour scale and tooltip. No legend, no thickness-mode toggle,
 * no column windowing yet - see the follow-up commits on the design this is
 * ported from (wastewater-analytics-experiment, MutationViolins.tsx) for those.
 */

/** Half the thickness, in pixels, of the band at its thickest bucket. */
const COVERAGE_BAND_MAX_HALF = 15;
/** A covered bucket never thins away to nothing, or it can't be told from an uncovered one. */
const COVERAGE_BAND_MIN_HALF = 1.5;
/** Room for the thickest band, with a little air above and below it. */
const ROW_HEIGHT = COVERAGE_BAND_MAX_HALF * 2 + 6;
/** The band is drawn in a stretched space, so x is an arbitrary round number. */
const SPAN = 1000;
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

export interface MutationBandsProps<F> {
    rowLabelHeader: string;
    data: TemporalDataMap<F> | null;
    isLoading: boolean;
    loadingRowLabels: string[];
    requestedDateRanges: Temporal[];
    colorScale: ColorScale;
    featureRenderer: FeatureRenderer<F>;
    tooltipPortalTarget: HTMLElement | null;
    pageSizes: PageSizes;
    /** Controlled page index (0-based); shared with the grid tab. */
    pageIndex: number;
    /** Total number of rows across all pages. */
    totalRows: number;
    onPageChange: Dispatch<SetStateAction<number>>;
    /** Shown at the very right of the pagination row below the bands, e.g. a download button. */
    paginationEnd?: ReactNode;
    /** Extra columns between the row label and the bands, with one value per row label. */
    customColumns?: CustomColumn[];
}

const NO_CUSTOM_COLUMNS: CustomColumn[] = [];

export function MutationBands<F>({
    rowLabelHeader,
    data,
    isLoading,
    loadingRowLabels,
    requestedDateRanges,
    colorScale,
    featureRenderer,
    tooltipPortalTarget,
    pageSizes,
    pageIndex,
    totalRows,
    onPageChange,
    paginationEnd,
    customColumns = NO_CUSTOM_COLUMNS,
}: MutationBandsProps<F>) {
    const columns = data?.getSecondAxisKeys() ?? requestedDateRanges;
    const features = useMemo(() => data?.getFirstAxisKeys() ?? [], [data]);
    const rows = useMemo(() => data?.getAsArray() ?? [], [data]);
    const gradientPrefix = useId();

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

    // Over every loaded cell, so a band's thickness doesn't shift between pages.
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
                    unused). Fixed layout with explicit widths for the label and custom
                    columns leaves the rest of the table to the date column. */}
                <table className='w-full' style={{ tableLayout: 'fixed' }}>
                    <thead>
                        <tr>
                            <th className='w-32'>{rowLabelHeader}</th>
                            {customColumns.map((customColumn) => (
                                <th key={customColumn.header} className='w-24'>
                                    {customColumn.header}
                                </th>
                            ))}
                            <th className='p-0'>
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
                                              colSpan={customColumns.length + 1}
                                              className='text-center'
                                          >
                                              <span className='loading loading-spinner loading-sm' />
                                          </td>
                                      )}
                                  </tr>
                              ))
                            : features.map((feature, rowIndex) => (
                                  <tr key={featureRenderer.asString(feature)}>
                                      <th className='font-medium whitespace-nowrap'>
                                          {featureRenderer.renderRowLabel(feature)}
                                      </th>
                                      {customColumns.map((customColumn) => (
                                          <td key={customColumn.header} className='text-center'>
                                              {customColumn.values[featureRenderer.asString(feature)]}
                                          </td>
                                      ))}
                                      <td className='p-0'>
                                          <BandRow
                                              feature={feature}
                                              values={rows[rowIndex] ?? []}
                                              columns={columns}
                                              colorScale={colorScale}
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
                                <td colSpan={customColumns.length + 2}>
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
    colorScale,
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
    colorScale: ColorScale;
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
                            const color = getColorWithinScale(getProportion(value), colorScale);
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
                                <div className='cursor-default' style={{ height: `${ROW_HEIGHT}px` }} />
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
