import { type Placement } from '@floating-ui/utils';
import {
    Fragment,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type ReactElement,
    type ReactNode,
    type RefObject,
} from 'react';

import { type BandViewSettings } from './band-view-settings';
import { getColorWithinScale } from './color-scale-selector';
import { nextSort, type FeatureSort, type SortColumn } from './featureSort';
import { formatProportion } from './formatProportion';
import { FloatingTooltip } from './hover-tooltip';
import { type TemporalDataMap } from './mutationsOverTime/MutationOverTimeData';
import { OverTimeGridTooltip } from './over-time-grid-tooltip';
import { getProportion, type ProportionValue } from './overTime/proportionValue';
import { Pagination, type PaginationProps } from './pagination';
import { type Temporal } from '../../util/temporalClass';

export interface FeatureRenderer<D> {
    asString(value: D): string;
    renderRowLabel(value: D): ReactElement;
    /** What the tooltip of a bucket says about the counts behind its proportion. */
    describe(value: D, proportionValue: NonNullable<ProportionValue>): ReactNode;
}

/**
 * Picks which side of a cell the tooltip should open on, so it stays within the visible bands
 * instead of overflowing off the top/bottom or left/right edge (meaning the tooltip tends to
 * open towards the 'center' of the component).
 */
function getTooltipPlacement(rowIndex: number, rows: number, columnIndex: number, columns: number): Placement {
    const side = rowIndex < rows / 2 || rowIndex < 6 ? 'bottom' : 'top';
    const alignment = columnIndex < columns / 2 ? 'start' : 'end';
    return `${side}-${alignment}`;
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
/** Behind a bucket with reads but none covering the feature: nothing could be measured there. */
const NO_COVERAGE_HATCHING = 'repeating-linear-gradient(135deg, rgb(0 0 0 / 0.15) 0 1px, transparent 1px 6px)';

function coverageHalfThickness(coverage: number, maxCoverage: number): number {
    if (coverage <= 0 || maxCoverage <= 0) {
        return 0;
    }
    const share = Math.log10(coverage + 1) / Math.log10(maxCoverage + 1);
    return Math.max(COVERAGE_BAND_MIN_HALF, Math.min(1, share) * COVERAGE_BAND_MAX_HALF);
}

function coverageOf(value: ProportionValue): number {
    return value?.type === 'value' ? value.coverage : 0;
}

export interface FeatureBandsProps<F> {
    rowLabelHeader: string;
    data: TemporalDataMap<F> | null;
    isLoading: boolean;
    loadingRowLabels: string[];
    requestedDateRanges: Temporal[];
    viewSettings: BandViewSettings;
    featureRenderer: FeatureRenderer<F>;
    /** The pagination row below the bands. */
    pagination: PaginationProps;
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
    /** One more column after the row label, by row label (see `FeatureRenderer.asString`). Not sortable. */
    extraColumn?: { header: string; render: (rowLabel: string) => ReactNode };
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
    pagination,
    meanProportions,
    jaccardIndices,
    extraColumn,
    sort,
    onSortChange,
}: FeatureBandsProps<F>) {
    const columns = data?.getSecondAxisKeys() ?? requestedDateRanges;
    const features = useMemo(() => data?.getFirstAxisKeys() ?? [], [data]);
    const rows = useMemo(() => data?.getAsArray() ?? [], [data]);
    const gradientPrefix = useId();
    const numberOfValueColumns = (jaccardIndices === undefined ? 1 : 2) + (extraColumn === undefined ? 0 : 1);
    const bandsRef = useRef<HTMLDivElement>(null);

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
            <div ref={bandsRef} className='overflow-auto'>
                {/* All the date buckets live inside one table column (a flex row in the
                    header, a band per row), instead of one table column per bucket:
                    browsers disagree on how to size dozens of empty auto-width columns
                    (Firefox gives each one a sliver and leaves the rest of the table
                    unused). The label and value columns are as narrow as their content
                    allows (`w-px`, the value headers wrapping), and the date column,
                    being `w-full`, gets all the rest. */}
                <table className='w-full'>
                    <thead>
                        {/* As high as a row of bands (with its line), which the two-line headers fit into. */}
                        <tr
                            className='divide-x divide-stone-200 border-b border-stone-200 text-xs'
                            style={{ height: `${ROW_HEIGHT + 1}px` }}
                        >
                            <SortableHeader column='rowLabel' sort={sort} onSortChange={onSortChange}>
                                {rowLabelHeader}
                            </SortableHeader>
                            {extraColumn !== undefined && <th className='px-2'>{extraColumn.header}</th>}
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
                    <tbody className='divide-y divide-stone-200'>
                        {isLoading
                            ? loadingRowLabels.map((label, rowIndex) => (
                                  <tr key={label} className='divide-x divide-stone-200'>
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
                                  <tr key={featureRenderer.asString(feature)} className='divide-x divide-stone-200'>
                                      <th className='px-2 font-medium whitespace-nowrap'>
                                          {featureRenderer.renderRowLabel(feature)}
                                      </th>
                                      {extraColumn !== undefined && (
                                          <td className='px-2 text-center whitespace-nowrap'>
                                              {extraColumn.render(featureRenderer.asString(feature))}
                                          </td>
                                      )}
                                      <td className='px-2 text-center whitespace-nowrap'>
                                          {formatMeanProportion(meanProportions[featureRenderer.asString(feature)])}
                                      </td>
                                      {jaccardIndices !== undefined && (
                                          <td
                                              className={`px-2 text-center whitespace-nowrap ${jaccardIndexShading(jaccardIndices[featureRenderer.asString(feature)])}`}
                                          >
                                              {formatJaccardIndex(jaccardIndices[featureRenderer.asString(feature)])}
                                          </td>
                                      )}
                                      <td className='p-0'>
                                          <BandRow
                                              values={rows[rowIndex] ?? []}
                                              columns={columns}
                                              viewSettings={viewSettings}
                                              maxCoverage={maxCoverage}
                                              gradientId={`${gradientPrefix}-${rowIndex}`}
                                              rowIndex={rowIndex}
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
            {!isLoading && (
                <CellTooltip
                    bandsRef={bandsRef}
                    features={features}
                    rows={rows}
                    columns={columns}
                    featureRenderer={featureRenderer}
                />
            )}
            {/* The table reaches the edges of the component, so its lines do; only this is padded. */}
            <div className='border-t border-stone-200 p-2'>
                <Pagination {...pagination} />
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
        <th className='w-px px-2' aria-sort={isSorted ? sort.direction : 'none'}>
            <button
                type='button'
                className='inline-flex cursor-pointer items-center gap-1 font-bold'
                onClick={() => onSortChange(nextSort(sort, column))}
            >
                {/* As narrow as the longest word: a header of two words takes two lines. */}
                <span className='w-min'>{children}</span>
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

/** A green background for a high Jaccard index, a darker one from .9: the rows most specific to the variant. */
export function jaccardIndexShading(jaccardIndex: number | undefined): string {
    if (jaccardIndex === undefined) {
        return '';
    }
    if (jaccardIndex >= 0.9) {
        return 'bg-green-200';
    }
    return jaccardIndex >= 0.8 ? 'bg-green-100' : '';
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
        return <p className='overflow-visible pl-2 text-nowrap'>{label}</p>;
    }
    if (index === numberOfColumns - 1) {
        return (
            <div className='flex justify-end @[6rem]:justify-center'>
                <p className='shrink-0 pr-2 text-nowrap'>{label}</p>
            </div>
        );
    }
    return <p className='invisible overflow-hidden text-nowrap @[6rem]:visible'>{label}</p>;
}

/**
 * The tooltip of the bucket under the mouse. There is one for all the buckets, which say which
 * one they are with `data-row` and `data-column`: one per bucket would be thousands of them on a
 * large page. It keeps its own state, so the bands aren't rendered again when the mouse moves.
 */
function CellTooltip<F>({
    bandsRef,
    features,
    rows,
    columns,
    featureRenderer,
}: {
    bandsRef: RefObject<HTMLElement | null>;
    features: F[];
    rows: (ProportionValue | undefined)[][];
    columns: Temporal[];
    featureRenderer: FeatureRenderer<F>;
}) {
    const [cell, setCell] = useState<HTMLElement | undefined>(undefined);
    const cellRef = useMemo(() => ({ current: cell ?? null }), [cell]);

    useEffect(() => {
        const bands = bandsRef.current;
        if (bands === null) {
            return;
        }
        const onMouseOver = (event: MouseEvent) =>
            setCell((event.target as Element).closest<HTMLElement>('[data-column]') ?? undefined);
        const onMouseLeave = () => setCell(undefined);
        bands.addEventListener('mouseover', onMouseOver);
        bands.addEventListener('mouseleave', onMouseLeave);
        return () => {
            bands.removeEventListener('mouseover', onMouseOver);
            bands.removeEventListener('mouseleave', onMouseLeave);
        };
    }, [bandsRef]);

    // The bucket can be gone since, e.g. after paging with the mouse still over it.
    if (cell?.isConnected !== true) {
        return null;
    }
    const rowIndex = Number(cell.dataset.row);
    const columnIndex = Number(cell.dataset.column);
    const feature = features.at(rowIndex);
    const date = columns.at(columnIndex);
    if (feature === undefined || date === undefined) {
        return null;
    }
    const value = rows[rowIndex]?.[columnIndex] ?? null;

    return (
        <FloatingTooltip
            referenceRef={cellRef}
            placement={getTooltipPlacement(rowIndex, features.length, columnIndex, columns.length)}
            // Not in the way of the mouse, which would leave the bands for it and close it.
            className='pointer-events-none'
        >
            <OverTimeGridTooltip
                label={featureRenderer.asString(feature)}
                date={date}
                value={value}
                description={value === null ? undefined : featureRenderer.describe(feature, value)}
            />
        </FloatingTooltip>
    );
}

/** One feature's band across the loaded date columns. */
function BandRow({
    values,
    columns,
    viewSettings,
    maxCoverage,
    gradientId,
    rowIndex,
}: {
    values: (ProportionValue | undefined)[];
    columns: Temporal[];
    viewSettings: BandViewSettings;
    maxCoverage: number;
    gradientId: string;
    rowIndex: number;
}) {
    const width = SPAN / columns.length;
    const centre = ROW_HEIGHT / 2;
    const halves = columns.map((_, index) => coverageHalfThickness(coverageOf(values[index] ?? null), maxCoverage));

    return (
        <div className='relative' style={{ height: `${ROW_HEIGHT}px` }}>
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
                    d={bandSegments(halves, width)
                        .map((knots) => bandPath(knots, centre))
                        .join(' ')}
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
                    const isUncovered = value?.type === 'noCoverage';
                    return (
                        <div
                            key={column.dateString}
                            className='@container flex flex-1 cursor-default items-center justify-center'
                            style={{
                                height: `${ROW_HEIGHT}px`,
                                backgroundImage: isUncovered ? NO_COVERAGE_HATCHING : undefined,
                            }}
                            data-row={rowIndex}
                            data-column={index}
                            data-no-coverage={isUncovered || undefined}
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
                    );
                })}
            </div>
        </div>
    );
}

/**
 * The knots of each stretch of the band, i.e. of each run of buckets that some reads cover
 * (`half > 0`). A bucket is measured at the middle of its column. At either end of the row
 * the band is drawn from nothing, as a violin tapers; next to a bucket without coverage it is
 * cut off square at the edge of the column, so it doesn't reach into a bucket where nothing
 * was measured.
 */
export function bandSegments(halves: number[], width: number): { x: number; half: number }[][] {
    const segments: { x: number; half: number }[][] = [];
    let current: { x: number; half: number }[] | undefined;
    halves.forEach((half, index) => {
        if (half <= 0) {
            if (current) {
                current.push({ x: index * width, half: current[current.length - 1].half });
                segments.push(current);
                current = undefined;
            }
            return;
        }
        current ??= [index === 0 ? { x: 0, half: 0 } : { x: index * width, half }];
        current.push({ x: (index + 0.5) * width, half });
    });
    if (current) {
        current.push({ x: halves.length * width, half: 0 });
        segments.push(current);
    }
    return segments;
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
