import { useLayoutEffect, useRef, useState } from 'react';
import { Link, type To } from 'react-router-dom';

import { UNDETERMINED_COLOR } from './lineageColors';
import { UNDETERMINED, type DeconvolutionResult } from '../../../lollipop';
import { type TemporalGranularity } from '../../types/dashboardComponents';
import { parseDateStringToTemporal } from '../../util/temporalClass';

const MARGIN = { top: 8, right: 12, bottom: 22, left: 40 };
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];
/** The opacity of a confidence band, and of the band of the lineage hovered in the legend. */
const BAND_OPACITY = 0.1;
const HIGHLIGHTED_BAND_OPACITY = 0.25;

/**
 * The estimated prevalence of each lineage over time, all in one chart: a point per sampling date
 * and a line through the points, over a translucent band of the confidence interval. Hovering a
 * lineage in the legend brings it to the front and shows only its band, clicking it goes to
 * `lineageLink` of the lineage, if there is one.
 */
export function DeconvolutionPlot({
    result,
    colors,
    granularity,
    lineageLink,
}: {
    result: DeconvolutionResult;
    /** The colour of each lineage of the panel (see `lineageColors`). */
    colors: Map<string, string>;
    /** What a date stands for: by week, it is the week's first day. */
    granularity: TemporalGranularity;
    /** Where the name of a lineage in the legend links to (not "Undetermined", which isn't one). */
    lineageLink?: (lineage: string) => To | undefined;
}) {
    const [container, { width, height }] = useSize();
    const colorOf = (variant: string) => colors.get(variant) ?? UNDETERMINED_COLOR;
    const [hovered, setHovered] = useState<number | undefined>(undefined);
    const [highlighted, setHighlighted] = useState<number | undefined>(undefined);

    const days = result.dates.map(({ date }) => toDay(date));
    const firstDay = days[0] ?? 0;
    const lastDay = days.at(-1) ?? 1;
    const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
    const plotHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);
    const x = (day: number) =>
        MARGIN.left + (lastDay === firstDay ? plotWidth / 2 : ((day - firstDay) / (lastDay - firstDay)) * plotWidth);
    const y = (proportion: number) => MARGIN.top + (1 - proportion) * plotHeight;

    const series = result.variants.map((variant, variantIndex) => ({
        variant,
        variantIndex,
        color: colorOf(variant),
        points: result.dates.map(({ date, estimates }, i) => ({
            date,
            px: x(days[i]),
            ...estimates[variantIndex],
        })),
    }));
    // The highlighted lineage is drawn last, on top of the others.
    const drawOrder =
        highlighted === undefined
            ? series
            : [...series.filter((s) => s.variantIndex !== highlighted), series[highlighted]];
    const opacity = (variantIndex: number) => (highlighted === undefined || highlighted === variantIndex ? 1 : 0.15);

    const hoveredDate = hovered === undefined ? undefined : result.dates[hovered];
    const hoveredX = hovered === undefined ? 0 : x(days[hovered]);

    const onPointerMove = (event: React.PointerEvent<SVGRectElement>) => {
        const svgX = event.clientX - event.currentTarget.getBoundingClientRect().left + MARGIN.left;
        let nearest = 0;
        days.forEach((day, i) => {
            if (Math.abs(x(day) - svgX) < Math.abs(x(days[nearest]) - svgX)) {
                nearest = i;
            }
        });
        setHovered(nearest);
    };

    return (
        <figure>
            {/* the height of the plot, which it measures (with the width) to draw in pixels */}
            <div ref={container} className='relative h-72'>
                {width > 0 && height > 0 && (
                    <svg
                        width={width}
                        height={height}
                        role='img'
                        aria-label='Estimated prevalence of the lineages over time'
                    >
                        {Y_TICKS.map((tick) => (
                            <g key={tick}>
                                <line
                                    x1={MARGIN.left}
                                    x2={width - MARGIN.right}
                                    y1={y(tick)}
                                    y2={y(tick)}
                                    stroke='#e7e5e4'
                                />
                                <text
                                    x={MARGIN.left - 6}
                                    y={y(tick)}
                                    dy='0.32em'
                                    textAnchor='end'
                                    className='fill-gray-500 text-[11px]'
                                >
                                    {tick * 100}%
                                </text>
                            </g>
                        ))}
                        {monthTicks(firstDay, lastDay).map((tick) => (
                            <text
                                key={tick.day}
                                x={x(tick.day)}
                                y={height - 6}
                                textAnchor='middle'
                                className='fill-gray-500 text-[11px]'
                            >
                                {tick.label}
                            </text>
                        ))}
                        {hoveredDate !== undefined && (
                            <line
                                x1={hoveredX}
                                x2={hoveredX}
                                y1={MARGIN.top}
                                y2={MARGIN.top + plotHeight}
                                stroke='#a8a29e'
                            />
                        )}
                        {/* All the bands first, so that no band covers another lineage's line. */}
                        {drawOrder.map(
                            ({ variant, variantIndex, color, points }) =>
                                (highlighted === undefined || highlighted === variantIndex) && (
                                    <path
                                        key={variant}
                                        d={bandPath(points, y)}
                                        fill={color}
                                        fillOpacity={
                                            highlighted === undefined ? BAND_OPACITY : HIGHLIGHTED_BAND_OPACITY
                                        }
                                    />
                                ),
                        )}
                        {drawOrder.map(({ variant, variantIndex, color, points }) => (
                            <g key={variant} opacity={opacity(variantIndex)}>
                                <path
                                    d={points
                                        .map((point, i) => `${i === 0 ? 'M' : 'L'}${point.px},${y(point.proportion)}`)
                                        .join('')}
                                    fill='none'
                                    stroke={color}
                                    strokeWidth={2}
                                    strokeLinejoin='round'
                                    strokeLinecap='round'
                                />
                                {points.map((point, i) => (
                                    <circle
                                        key={point.date}
                                        cx={point.px}
                                        cy={y(point.proportion)}
                                        r={i === hovered ? 5 : 3.5}
                                        fill={color}
                                        stroke='white'
                                        strokeWidth={i === hovered ? 2 : 1}
                                    />
                                ))}
                            </g>
                        ))}
                        <rect
                            x={MARGIN.left}
                            y={MARGIN.top}
                            width={plotWidth}
                            height={plotHeight}
                            fill='transparent'
                            onPointerMove={onPointerMove}
                            onPointerLeave={() => setHovered(undefined)}
                        />
                    </svg>
                )}
                {hoveredDate !== undefined && (
                    <div
                        className='pointer-events-none absolute z-10 rounded border border-stone-300 bg-white px-2 py-1 text-xs whitespace-nowrap shadow'
                        style={{
                            top: MARGIN.top,
                            ...(hoveredX > width / 2 ? { right: width - hoveredX + 8 } : { left: hoveredX + 8 }),
                        }}
                    >
                        <div className='mb-1 text-gray-600'>{dateLabel(hoveredDate.date, granularity)}</div>
                        <table>
                            <tbody>
                                {hoveredDate.estimates.map((estimate) => (
                                    <tr key={estimate.variant}>
                                        <td className='pr-1.5'>
                                            <span
                                                className='inline-block h-2 w-2 rounded-full'
                                                style={{
                                                    backgroundColor: colorOf(estimate.variant),
                                                }}
                                            />
                                        </td>
                                        <td className='pr-3'>{variantLabel(estimate.variant)}</td>
                                        <td className='pr-3 text-right font-semibold'>
                                            {formatPercent(estimate.proportion)}
                                        </td>
                                        <td className='text-gray-600'>95% CI {formatInterval(estimate)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <figcaption className='mt-3 flex flex-wrap gap-x-5 gap-y-1'>
                {series.map(({ variant, variantIndex, color }) => (
                    <span
                        key={variant}
                        className='flex cursor-default items-center gap-1.5 text-sm'
                        onPointerEnter={() => setHighlighted(variantIndex)}
                        onPointerLeave={() => setHighlighted(undefined)}
                    >
                        <span className='inline-block h-2.5 w-2.5 rounded-full' style={{ backgroundColor: color }} />
                        <LegendLabel to={variant === UNDETERMINED ? undefined : lineageLink?.(variant)}>
                            {variantLabel(variant)}
                        </LegendLabel>
                    </span>
                ))}
            </figcaption>
        </figure>
    );
}

function LegendLabel({ to, children }: { to: To | undefined; children: string }) {
    if (to === undefined) {
        return <span>{children}</span>;
    }
    return (
        <Link to={to} className='link link-hover'>
            {children}
        </Link>
    );
}

/**
 * The area between the lower and upper bounds, as one closed shape per run of dates that have
 * both (the bounds are `NaN` where the standard error can't be computed).
 */
function bandPath(
    points: readonly { px: number; lower: number; upper: number }[],
    y: (proportion: number) => number,
): string {
    const runs: { px: number; lower: number; upper: number }[][] = [[]];
    for (const point of points) {
        if (Number.isFinite(point.lower) && Number.isFinite(point.upper)) {
            runs[runs.length - 1].push(point);
        } else if (runs[runs.length - 1].length > 0) {
            runs.push([]);
        }
    }
    return runs
        .filter((run) => run.length > 0)
        .map((run) => {
            const upper = run.map((point, i) => `${i === 0 ? 'M' : 'L'}${point.px},${y(point.upper)}`);
            const lower = [...run].reverse().map((point) => `L${point.px},${y(point.lower)}`);
            return `${upper.join('')}${lower.join('')}Z`;
        })
        .join('');
}

/** The date itself by day, the week (like `2026-W21`) or month by week or month. */
function dateLabel(date: string, granularity: TemporalGranularity): string {
    return granularity === 'day' ? date : parseDateStringToTemporal(date, granularity).dateString;
}

function variantLabel(variant: string): string {
    return variant === UNDETERMINED ? 'Undetermined' : variant;
}

function useSize() {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    useLayoutEffect(() => {
        const element = ref.current;
        if (element === null) {
            return;
        }
        const observer = new ResizeObserver(([entry]) =>
            setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) }),
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    return [ref, size] as const;
}

/** The first of every month in the range, thinned out so that the labels don't collide. */
function monthTicks(firstDay: number, lastDay: number): { day: number; label: string }[] {
    const ticks: { day: number; label: string }[] = [];
    const date = new Date(firstDay * 86_400_000);
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + 1);
    while (date.getTime() / 86_400_000 <= lastDay) {
        ticks.push({
            day: date.getTime() / 86_400_000,
            label: date.toLocaleString('en-US', {
                month: 'short',
                timeZone: 'UTC',
                ...(date.getUTCMonth() === 0 && { year: 'numeric' }),
            }),
        });
        date.setUTCMonth(date.getUTCMonth() + 1);
    }
    const step = Math.ceil(ticks.length / 8);
    return ticks.filter((_, i) => i % step === 0);
}

function toDay(isoDate: string): number {
    return Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000;
}

function formatPercent(proportion: number): string {
    if (!Number.isFinite(proportion)) {
        return '–';
    }
    return `${(proportion * 100).toFixed(proportion < 0.1 ? 1 : 0)}%`;
}

function formatInterval({ lower, upper }: { lower: number; upper: number }): string {
    return `${formatPercent(lower)}–${formatPercent(upper)}`;
}
