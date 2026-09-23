import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';

import { useSampleOverview } from '../../../dataLayer/hooks/sampleOverview';
import { type SampleOverview } from '../../../dataLayer/queries';
import { Loading } from '../../../util/Loading';
import { MinMaxRangeSlider } from '../../inputs/min-max-range-slider';
import { singleGraphColorRGBAById } from '../../shared/charts/colors';

/**
 * Which locations were sampled on which dates, and which sequencing batch each sample came
 * from: one row per location, one column per sampling date, coloured by batch and shaded by
 * read depth. Modelled on wastewater-analytics-experiment's own `SamplesOverTime`, reverse
 * engineered from its live preview (its checked-out source only shades by depth, no batch
 * colour — the preview runs code this repo doesn't have) rather than ported from source.
 *
 * A date with no sample is drawn hatched, not left out, so a gap in surveillance reads as a
 * gap. Unfiltered, like the rest of the overview page.
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

const ROW_HEIGHT = '1.25rem';

export function SamplesOverTimeGrid({ samples }: { samples: SampleOverview[] }) {
    const locations = useMemo(() => [...new Set(samples.map((sample) => sample.locationName))].sort(), [samples]);
    const dates = useMemo(() => [...new Set(samples.map((sample) => sample.date))].sort(), [samples]);

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

    // Undefined until the user moves it; dates accumulate as sampling continues.
    const [range, setRange] = useState<{ from: number; to: number } | undefined>(undefined);
    const defaultRange = { from: 0, to: Math.max(0, dates.length - 1) };
    const window = range ?? defaultRange;
    const visible = useMemo(() => dates.slice(window.from, window.to + 1), [dates, window.from, window.to]);

    if (dates.length === 0 || locations.length === 0) {
        return null;
    }

    return (
        <div className='border border-stone-300 bg-white p-2'>
            <table className='w-full table-fixed'>
                <colgroup>
                    <col style={{ width: '10rem' }} />
                    <col />
                </colgroup>
                <thead>
                    <tr>
                        <th className='px-2 text-left align-bottom text-sm font-normal text-stone-500'>Location</th>
                        <th className='p-0 align-bottom'>
                            {/* One header cell per column, so a date sits over the column it names
                                however the width is shared out - the same layout `feature-bands.tsx`
                                uses, which avoids Firefox giving many tiny auto-width table columns
                                a sliver each. */}
                            <div className='flex w-full items-end'>
                                {visible.map((date, index) => (
                                    <div key={date} className='@container min-w-0 flex-1'>
                                        <DateHeaderLabel date={date} index={index} numberOfColumns={visible.length} />
                                    </div>
                                ))}
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {locations.map((location) => (
                        <tr key={location}>
                            <th className='truncate px-2 text-left text-sm font-normal' title={location}>
                                {location}
                            </th>
                            <td className='p-0'>
                                <div className='flex w-full' style={{ height: ROW_HEIGHT }}>
                                    {visible.map((date) => {
                                        const sample = byLocationAndDate.get(`${location}|${date}`);
                                        return sample === undefined ? (
                                            <div
                                                key={date}
                                                className='h-full min-w-0 flex-1 border-r border-b border-stone-100'
                                                style={{ background: ABSENT_FILL }}
                                                title={`${location}, ${date}: no sample`}
                                            />
                                        ) : (
                                            <div
                                                key={date}
                                                className='h-full min-w-0 flex-1 border-r border-b border-stone-100'
                                                style={{
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

            {dates.length > 1 && (
                <div className='mt-3 px-2'>
                    <span className='text-xs text-stone-500'>
                        Visible dates: {dates[window.from]} – {dates[window.to]}
                    </span>
                    {/* Functional updates, not `{ ..., to: window.to }`: when a drag crosses the
                        other thumb, MinMaxRangeSlider fires both setMin and setMax in the same
                        event, back to back. Closing over `window` would have the second call
                        overwrite the first's change with a stale value of the field it didn't
                        touch, snapping the thumbs back apart instead of letting them meet. */}
                    <MinMaxRangeSlider
                        min={window.from}
                        max={window.to}
                        setMin={(from) => setRange((prev) => ({ from, to: (prev ?? defaultRange).to }))}
                        setMax={(to) => setRange((prev) => ({ from: (prev ?? defaultRange).from, to }))}
                        rangeMin={0}
                        rangeMax={dates.length - 1}
                        step={1}
                    />
                </div>
            )}

            <SamplesOverTimeLegend />
        </div>
    );
}

/**
 * The label of one column above the grid, rotated so many narrow date columns still fit one
 * each. The first and last are always shown; the ones between only when their own column is
 * wide enough not to crowd its neighbours - so narrowing the visible-dates window above (which
 * widens every remaining column) reveals more of them, without measuring anything in script.
 */
function DateHeaderLabel({ date, index, numberOfColumns }: { date: string; index: number; numberOfColumns: number }) {
    const style = { writingMode: 'vertical-rl', rotate: '180deg' } as const;
    if (index === 0 || index === numberOfColumns - 1) {
        return (
            <div className='mx-auto text-[10px] text-nowrap text-stone-500' style={style}>
                {date}
            </div>
        );
    }
    return (
        <div className='invisible mx-auto text-[10px] text-nowrap text-stone-500 @[1rem]:visible' style={style}>
            {date}
        </div>
    );
}

function SamplesOverTimeLegend() {
    return (
        <div className='mt-2 flex flex-wrap items-center gap-4 px-2 text-xs text-stone-500'>
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
