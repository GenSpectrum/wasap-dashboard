import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';

import { useSampleOverview } from '../../../dataLayer/hooks/sampleOverview';
import { type SampleOverview } from '../../../dataLayer/queries';
import { Loading } from '../../../util/Loading';
import { singleGraphColorRGBAById } from '../../shared/charts/colors';

/**
 * Which locations were sampled on which dates, and which sequencing batch each sample came
 * from: one row per location, one column per sampling date, coloured by batch and shaded by
 * read depth, with a thick line marking the start of each week. Modelled on
 * wastewater-analytics-experiment's own `SamplesOverTime`, reverse engineered from its live
 * preview (its checked-out source only shades by depth, no batch colour — the preview runs code
 * this repo doesn't have) rather than ported from source.
 *
 * A date with no sample is drawn hatched, not left out, so a gap in surveillance reads as a
 * gap. Unfiltered, like the rest of the overview page.
 *
 * Every date is loaded and in the DOM - it's the horizontal scrollbar under the grid that keeps
 * a long history cheap to look at, not a filter - and the grid opens scrolled to the most recent
 * samples.
 */
export function SamplesOverTimePlot() {
    const { data, isPending, isError, error } = useSampleOverview();

    if (isPending) {
        return <Loading />;
    }

    if (isError) {
        return <span>{error.message}</span>;
    }

    return <SamplesOverTimeGrid samples={data} />;
}

/**
 * Below this many reads a sample's cell is the palest of the three depth tiers, at or above
 * this many it is the mid tier — both thresholds read off the live reference tool's legend and
 * confirmed against its rendered cells (the boundary sits exactly at 10,000 and, going by the
 * legend text, at 500,000 — no samples of this dataset landed close enough to 500,000 to
 * pin that one down the same way).
 */
const LOW_READS_THRESHOLD = 10_000;
const HIGH_READS_THRESHOLD = 500_000;
const LOW_OPACITY = 0.35;
const MID_OPACITY = 0.65;

function depthOpacity(reads: number): number {
    if (reads >= HIGH_READS_THRESHOLD) {
        return 1;
    }
    if (reads >= LOW_READS_THRESHOLD) {
        return MID_OPACITY;
    }
    return LOW_OPACITY;
}

/** Matches the hatch the app already uses for "nothing here" cells elsewhere, in this app's greys. */
const ABSENT_FILL = 'repeating-linear-gradient(45deg, var(--color-stone-300) 0 1px, var(--color-stone-100) 1px 4px)';

// Between the original 20px (too cramped next to LocationOverviewTable's rows) and that table's
// own 37px (too spaced out for a grid of colour swatches rather than text).
const ROW_HEIGHT = '28px';
const HEADER_HEIGHT = '28px';
const LOCATION_COLUMN_WIDTH = '10rem';

/**
 * Narrow enough that a typical window shows roughly the most recent 90 days before the
 * horizontal scrollbar is needed, wide enough that a week - 7 of these - comfortably fits a
 * Monday's upright date label without crowding the next week's.
 */
const DAY_WIDTH_PX = 13;

/** `date` is a `YYYY-MM-DD` string, parsed as UTC so a viewer's own timezone can't shift which
 * day of the week it falls on. 0 = Sunday, ..., 6 = Saturday. */
function isMonday(date: string): boolean {
    return new Date(`${date}T00:00:00Z`).getUTCDay() === 1;
}

const DAY_LABEL_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "24. Jan", "8. Sep": day of month, then the month abbreviated - shorter than the ISO form and
 * closer to how a date gets said out loud. */
function formatDayLabel(date: string): string {
    const parts = DAY_LABEL_FORMAT.formatToParts(new Date(`${date}T00:00:00Z`));
    const day = parts.find((part) => part.type === 'day')?.value ?? '';
    const month = parts.find((part) => part.type === 'month')?.value ?? '';
    return `${day}. ${month}`;
}

/** Every calendar day from `from` to `to`, inclusive, both `YYYY-MM-DD`. */
function eachDateBetween(from: string, to: string): string[] {
    const dates: string[] = [];
    const end = new Date(`${to}T00:00:00Z`).getTime();
    for (let day = new Date(`${from}T00:00:00Z`).getTime(); day <= end; day += 24 * 60 * 60 * 1000) {
        dates.push(new Date(day).toISOString().slice(0, 10));
    }
    return dates;
}

export function SamplesOverTimeGrid({ samples }: { samples: SampleOverview[] }) {
    const locations = useMemo(() => [...new Set(samples.map((sample) => sample.locationName))].sort(), [samples]);

    // Every calendar day in range, not just the days something was sampled on: sampling doesn't
    // happen daily, so leaving the empty days out would silently compress them away instead of
    // reading as the gap they are, and would throw off both the week dividers (a dead week would
    // vanish rather than showing as one) and how many days actually fit in the default view.
    const dates = useMemo(() => {
        const sampledDates = samples.map((sample) => sample.date).sort();
        return sampledDates.length === 0 ? [] : eachDateBetween(sampledDates[0], sampledDates[sampledDates.length - 1]);
    }, [samples]);

    // A batch's colour is fixed (the palette cycles, so two batches can share a hue once there
    // are more than the palette has), by the sorted order of its ID - deterministic, unlike "the
    // order batches were first seen while fetching", which the live reference tool's own
    // (unavailable) source presumably uses instead.
    const colorIndexByBatch = useMemo(() => {
        const batchIds = [...new Set(samples.map((sample) => sample.batchId))].sort();
        return new Map(batchIds.map((batchId, index) => [batchId, index]));
    }, [samples]);

    const byLocationAndDate = useMemo(() => {
        const map = new Map<string, SampleOverview>();
        for (const sample of samples) {
            map.set(`${sample.locationName}|${sample.date}`, sample);
        }
        return map;
    }, [samples]);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Whether there's more to see left/right of what's currently in view, so the faded edges
    // below only show on a side that actually scrolls further - not a fixed decoration.
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const updateScrollShadows = useCallback(() => {
        const el = scrollRef.current;
        if (!el) {
            return;
        }
        setCanScrollLeft(el.scrollLeft > 1);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }, []);

    // Scrolled to the most recent dates on first render, before the browser paints, so there's
    // no flash of the oldest samples first. Only re-scrolls when the number of dates changes
    // (sampling continues), not on every refetch, so it doesn't yank a viewer back to "now" while
    // they're looking at history.
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (el) {
            el.scrollLeft = el.scrollWidth;
        }
        updateScrollShadows();
    }, [dates.length, updateScrollShadows]);

    // The panel can also change width from under the grid (a sidebar opening, the window
    // resizing) without the grid itself scrolling, which needs the same recheck.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) {
            return;
        }
        const observer = new ResizeObserver(updateScrollShadows);
        observer.observe(el);
        return () => observer.disconnect();
    }, [updateScrollShadows]);

    if (dates.length === 0 || locations.length === 0) {
        return null;
    }

    const datesWidth = dates.length * DAY_WIDTH_PX;

    return (
        <div className='border border-stone-300 bg-white p-2'>
            <div className='relative'>
                <div ref={scrollRef} className='overflow-x-auto' onScroll={updateScrollShadows}>
                    <table
                        className='table-fixed border-collapse'
                        style={{ width: `calc(${LOCATION_COLUMN_WIDTH} + ${datesWidth}px)` }}
                    >
                        <colgroup>
                            <col style={{ width: LOCATION_COLUMN_WIDTH }} />
                            <col style={{ width: `${datesWidth}px` }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className='sticky left-0 z-10 bg-white px-2 text-left align-bottom text-sm font-normal text-stone-500'>
                                    Location
                                </th>
                                <th className='p-0 align-bottom'>
                                    {/* One header cell for every date, so a date sits over the column
                                        it names however the width is shared out - the same layout
                                        `feature-bands.tsx` uses, which avoids Firefox giving many
                                        tiny auto-width table columns a sliver each. */}
                                    <div className='flex' style={{ height: HEADER_HEIGHT }}>
                                        {dates.map((date) => (
                                            <div
                                                key={date}
                                                className={`relative shrink-0 ${isMonday(date) ? 'border-l-2 border-stone-400' : ''}`}
                                                style={{ width: DAY_WIDTH_PX }}
                                            >
                                                {/* Anchored to its own narrow column but not confined
                                                    to it - a date is wider than one day, so it
                                                    overflows into the six undated columns after it,
                                                    the same way the week that starts here does. */}
                                                {isMonday(date) && (
                                                    <div className='absolute left-0 text-sm text-nowrap text-stone-500'>
                                                        {formatDayLabel(date)}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {locations.map((location) => (
                                <tr key={location}>
                                    <th
                                        className='sticky left-0 z-10 truncate bg-white px-2 text-left text-sm font-normal'
                                        title={location}
                                    >
                                        {location}
                                    </th>
                                    <td className='p-0'>
                                        <div className='flex' style={{ height: ROW_HEIGHT }}>
                                            {dates.map((date) => {
                                                const sample = byLocationAndDate.get(`${location}|${date}`);
                                                const weekBorder = isMonday(date)
                                                    ? 'border-l-2 border-l-stone-400'
                                                    : '';
                                                return sample === undefined ? (
                                                    <div
                                                        key={date}
                                                        className={`h-full shrink-0 border-r border-b border-stone-100 ${weekBorder}`}
                                                        style={{ width: DAY_WIDTH_PX, background: ABSENT_FILL }}
                                                        title={`${location}, ${date}: no sample`}
                                                    />
                                                ) : (
                                                    <div
                                                        key={date}
                                                        className={`h-full shrink-0 border-r border-b border-stone-100 ${weekBorder}`}
                                                        style={{
                                                            width: DAY_WIDTH_PX,
                                                            backgroundColor: singleGraphColorRGBAById(
                                                                colorIndexByBatch.get(sample.batchId) ?? 0,
                                                                depthOpacity(sample.reads),
                                                            ),
                                                        }}
                                                        title={`${sample.sampleId} — ${date} — batch ${sample.batchId} — ${sample.reads.toLocaleString('en-us')} reads`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Anchored to the panel, not the scrolling table, so they stay put at the visible
                    edges instead of scrolling away with the content they're fading. Start after the
                    sticky location column: that column is never faded, it's always fully there. */}
                <div
                    className={`pointer-events-none absolute inset-y-0 w-8 bg-gradient-to-r from-white to-transparent transition-opacity duration-150 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}
                    style={{ left: LOCATION_COLUMN_WIDTH }}
                />
                <div
                    className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent transition-opacity duration-150 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}
                />
            </div>

            <SamplesOverTimeLegend />
        </div>
    );
}

function SamplesOverTimeLegend() {
    return (
        <div className='mt-2 flex flex-wrap items-center gap-4 px-2 text-sm text-stone-500'>
            <LegendSwatch style={{ background: ABSENT_FILL }}>no sample</LegendSwatch>
            <LegendSwatch style={{ backgroundColor: singleGraphColorRGBAById(0, LOW_OPACITY) }}>
                &lt; {LOW_READS_THRESHOLD.toLocaleString('en-us')}
            </LegendSwatch>
            <LegendSwatch style={{ backgroundColor: singleGraphColorRGBAById(0, MID_OPACITY) }}>
                {LOW_READS_THRESHOLD.toLocaleString('en-us')} – {HIGH_READS_THRESHOLD.toLocaleString('en-us')}
            </LegendSwatch>
            <LegendSwatch style={{ backgroundColor: singleGraphColorRGBAById(0, 1) }}>
                ≥ {HIGH_READS_THRESHOLD.toLocaleString('en-us')} reads
            </LegendSwatch>
            <span>Samples of the same batch have the same colour.</span>
            <span>A thick line marks the start of each week.</span>
        </div>
    );
}

function LegendSwatch({ style, children }: { style: CSSProperties; children: ReactNode }) {
    return (
        <span className='flex items-center gap-1'>
            <span className='inline-block h-3 w-5 border border-stone-300' style={style} />
            {children}
        </span>
    );
}
