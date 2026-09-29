import { useState, type CSSProperties, type MouseEvent } from 'react';

import { OverviewPanel } from './OverviewPanel';
import { type AmpliconsConfig } from '../../../amplicons/ampliconsConfig';
import { type Amplicon } from '../../../amplicons/primerBed';
import { useAmplicons } from '../../../amplicons/useAmplicons';
import {
    useMedianAmpliconCoverage,
    type MedianAmpliconCoverageGrid,
    type SampleAmpliconCoverage,
} from '../../../dataLayer/hooks/medianAmpliconCoverage';
import { Loading } from '../../../util/Loading';
import { type TemporalClass } from '../../../util/temporalClass';
import { singleGraphColorRGBByName } from '../../shared/charts/colors';
import { ErrorDisplay } from '../../shared/error-display';

const COLOR = 'indigo';
const ROW_HEIGHT = 28;
/** As high as the sampling timeline's header row. */
const HEADER_HEIGHT = 28;
const LOCATION_COLUMN_WIDTH = '10rem';
/** Roughly how many week labels fit above the grid. */
const MAX_COLUMN_LABELS = 10;
/** Matches the hatch of the samples plot above for "no sample here". */
const ABSENT_FILL = 'repeating-linear-gradient(45deg, var(--color-stone-300) 0 1px, var(--color-stone-100) 1px 4px)';

type Hovered = { row: number; column: number; x: number; y: number };

/**
 * The median amplicon coverage per location and week (see `useMedianAmpliconCoverage`): the median
 * over a sample's amplicons of their reads, and the median of that over the week's samples. A
 * proxy for how much virus the samples had. Log scale, since it spans from 0 (most amplicons
 * dropped out) to thousands. Only there for an organism with a primer scheme.
 */
export function MedianAmpliconCoverageHeatmap({ amplicons: ampliconsConfig }: { amplicons: AmpliconsConfig }) {
    const amplicons = useAmplicons(ampliconsConfig);

    return (
        <OverviewPanel title='Median amplicon coverage' info={<CoverageInfo />}>
            {amplicons.isError ? (
                <ErrorDisplay error={amplicons.error} />
            ) : amplicons.data === undefined ? (
                <Loading />
            ) : (
                <Grid amplicons={amplicons.data} />
            )}
        </OverviewPanel>
    );
}

function CoverageInfo() {
    return (
        <div className='w-96 space-y-2 text-sm font-normal text-gray-700'>
            <p>
                The median reads per amplicon of each sample, per location and week (the median over the week&apos;s
                samples). A proxy for how much virus a sample had.
            </p>
            <p>
                With little viral RNA, most amplicons don&apos;t amplify, and those that do come from a few genomes
                however many reads they have, so the sample&apos;s mutation proportions are unreliable. A low value can
                also be a failed batch or a shallow sequencing run; the tooltip of a cell lists the samples and their
                batches.
            </p>
            <p>
                An amplicon&apos;s reads are counted at the middle of the part of its insert no other amplicon covers.
            </p>
        </div>
    );
}

function Grid({ amplicons }: { amplicons: Amplicon[] }) {
    const coverage = useMedianAmpliconCoverage(amplicons);
    const [hovered, setHovered] = useState<Hovered | null>(null);

    if (coverage.error) {
        return <ErrorDisplay error={coverage.error} />;
    }
    if (coverage.data === undefined) {
        return <Loading />;
    }

    const grid = coverage.data;
    const values = grid.cells.map((row) => row.map((cell) => cell.medianAmpliconReads));
    const scale = logScale(values);
    const labelEvery = Math.max(1, Math.ceil(grid.weeks.length / MAX_COLUMN_LABELS));
    const gridColumns = `repeat(${grid.weeks.length}, minmax(10px, 1fr))`;

    const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
        const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-row]');
        setHovered(
            cell === null
                ? null
                : {
                      row: Number(cell.dataset.row),
                      column: Number(cell.dataset.column),
                      x: event.clientX,
                      y: event.clientY,
                  },
        );
    };

    return (
        <div>
            <div className='flex'>
                <div className='shrink-0' style={{ width: LOCATION_COLUMN_WIDTH }}>
                    <div className='flex items-end text-sm font-bold' style={{ height: HEADER_HEIGHT }}>
                        Location
                    </div>
                    {grid.locations.map((location) => (
                        <div
                            key={location}
                            className='flex items-center truncate pr-2 text-sm'
                            style={{ height: ROW_HEIGHT }}
                            title={location}
                        >
                            {location}
                        </div>
                    ))}
                </div>
                <div className='min-w-0 flex-1 overflow-x-auto'>
                    {/* Styled like the sampling timeline's dates: each sits a little off the bottom-left
                        corner of its week's column, overflowing into the columns after it. */}
                    <div
                        className='grid text-xs font-bold text-stone-500'
                        style={{ gridTemplateColumns: gridColumns, height: HEADER_HEIGHT }}
                        aria-hidden
                    >
                        {grid.weeks.map((week, column) => (
                            <div key={column} className='relative'>
                                {/* None too close to the right edge, where it would be cut off. */}
                                {column % labelEvery === 0 && column < grid.weeks.length - 3 && (
                                    <div className='absolute bottom-1 left-1 text-nowrap'>{weekLabel(week)}</div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div
                        role='img'
                        aria-label={`Median amplicon coverage of ${grid.locations.length} locations over ${grid.weeks.length} weeks`}
                        className='grid gap-px bg-white'
                        style={{ gridTemplateColumns: gridColumns, gridAutoRows: ROW_HEIGHT - 1, rowGap: 1 }}
                        onMouseMove={onMouseMove}
                        onMouseLeave={() => setHovered(null)}
                    >
                        {values.map((row, rowIndex) =>
                            row.map((value, column) => (
                                <div
                                    key={`${rowIndex}-${column}`}
                                    data-row={rowIndex}
                                    data-column={column}
                                    style={
                                        value === null
                                            ? { background: ABSENT_FILL }
                                            : { backgroundColor: cellColor(value, scale) }
                                    }
                                    className={
                                        hovered?.row === rowIndex && hovered.column === column
                                            ? 'outline-2 outline-gray-900'
                                            : ''
                                    }
                                />
                            )),
                        )}
                    </div>
                </div>
            </div>
            {/* Under the grid only, not the location names. */}
            <div className='mt-3' style={{ marginLeft: LOCATION_COLUMN_WIDTH }}>
                <Legend scale={scale} />
            </div>
            {hovered !== null && (
                <div
                    className='pointer-events-none fixed z-50 border border-stone-300 bg-white px-3 py-2 text-sm shadow-md'
                    style={tooltipPosition(hovered)}
                >
                    <CellTooltip grid={grid} row={hovered.row} column={hovered.column} />
                </div>
            )}
        </div>
    );
}

function CellTooltip({ grid, row, column }: { grid: MedianAmpliconCoverageGrid; row: number; column: number }) {
    const { samples, medianAmpliconReads } = grid.cells[row][column];
    return (
        <div className='space-y-1'>
            <div className='font-semibold'>{grid.locations[row]}</div>
            <div className='text-gray-600'>{grid.weeks[column].englishName()}</div>
            {medianAmpliconReads === null ? (
                <div>No samples this week</div>
            ) : (
                <>
                    <div>
                        Median reads per amplicon:{' '}
                        <span className='font-semibold'>{Math.round(medianAmpliconReads).toLocaleString()}</span>
                    </div>
                    <table className='text-xs'>
                        <thead className='text-gray-600'>
                            <tr>
                                <th className='pr-3 text-left font-normal'>Sample date</th>
                                <th className='pr-3 text-right font-normal'>Median reads</th>
                                <th className='pr-3 text-right font-normal'>Amplified</th>
                                <th className='text-left font-normal'>Batch</th>
                            </tr>
                        </thead>
                        <tbody>
                            {samples.map((sample) => (
                                <SampleRow key={sample.sampleId} sample={sample} ampliconCount={grid.ampliconCount} />
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
}

function SampleRow({ sample, ampliconCount }: { sample: SampleAmpliconCoverage; ampliconCount: number }) {
    return (
        <tr>
            <td className='pr-3'>{sample.date}</td>
            <td className='pr-3 text-right'>{Math.round(sample.medianAmpliconReads).toLocaleString()}</td>
            <td className='pr-3 text-right'>
                {sample.amplifiedAmplicons}/{ampliconCount}
            </td>
            <td className='font-mono'>{sample.batchId}</td>
        </tr>
    );
}

/**
 * Next to the cursor, on the side towards the middle of the window, so the tooltip stays on
 * screen at the grid's right and bottom edges.
 */
function tooltipPosition({ x, y }: Hovered): CSSProperties {
    const offset = 12;
    return {
        ...(x < window.innerWidth / 2 ? { left: x + offset } : { right: window.innerWidth - x + offset }),
        ...(y < window.innerHeight / 2 ? { top: y + offset } : { bottom: window.innerHeight - y + offset }),
    };
}

type LogScale = { min: number; max: number } | undefined;

function Legend({ scale }: { scale: LogScale }) {
    if (scale === undefined) {
        return <div className='text-sm text-gray-600'>No sample has reads on its amplicons.</div>;
    }
    const stops = Array.from({ length: 11 }, (_, index) =>
        singleGraphColorRGBByName(COLOR, 0.08 + (0.92 * index) / 10),
    );
    return (
        <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600'>
            <div className='flex items-center gap-2'>
                <span>{scale.min.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                <div className='h-3 w-16' style={{ background: `linear-gradient(to right, ${stops.join(', ')})` }} />
                <span>{Math.round(scale.max).toLocaleString()} median reads per amplicon</span>
                <span>(log scale)</span>
            </div>
            <div className='flex items-center gap-1'>
                <div className='h-3 w-3 border border-stone-300 bg-white' />
                <span>0</span>
            </div>
            <div className='flex items-center gap-1'>
                <div className='h-3 w-3' style={{ background: ABSENT_FILL }} />
                <span>No samples</span>
            </div>
        </div>
    );
}

function logScale(values: (number | null)[][]): LogScale {
    const positive = values.flat().filter((value): value is number => value !== null && value > 0);
    if (positive.length === 0) {
        return undefined;
    }
    return { min: Math.min(...positive), max: Math.max(...positive) };
}

function cellColor(value: number, scale: LogScale): string {
    if (value <= 0 || scale === undefined) {
        return 'white';
    }
    const span = Math.log10(scale.max) - Math.log10(scale.min);
    const t = span === 0 ? 1 : (Math.log10(value) - Math.log10(scale.min)) / span;
    // Starts a little above 0, so the smallest non-zero value can still be told from 0.
    return singleGraphColorRGBByName(COLOR, 0.08 + 0.92 * t);
}

/** `W34`: the year is left out, the sampling timeline above has the dates. */
function weekLabel(week: TemporalClass): string {
    return week.dateString.split('-')[1];
}
