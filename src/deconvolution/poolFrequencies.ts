import { type MutationFrequency } from '../../lollipop';
import { type SampleMutationFrequency } from '../dataLayer/hooks/mutationFrequencies';
import { type TemporalGranularity } from '../types/dashboardComponents';
import { parseDateStringToTemporal } from '../util/temporalClass';

/**
 * The frequencies to deconvolve at a granularity: by day, every sample as it is; coarser, the
 * samples of a week (or month, …) pooled into one, dated to its first day — the reads of all its
 * samples together, so `Σ count / Σ coverage`, which weighs each sample by its coverage.
 *
 * The deconvolution then gives one estimate per week. Its kernel stays in days, so with the default
 * bandwidth (a standard deviation of about 3 days) the neighbouring weeks weigh in only a little.
 */
export function poolFrequencies(
    frequencies: readonly SampleMutationFrequency[],
    granularity: TemporalGranularity,
): MutationFrequency[] {
    if (granularity === 'day') {
        return frequencies.map(({ date, mutation, frac }) => ({ date, mutation, frac }));
    }
    const pooled = new Map<string, { date: string; mutation: string; count: number; coverage: number }>();
    for (const { date, mutation, frac, coverage } of frequencies) {
        const bucket = parseDateStringToTemporal(date, granularity).firstDay.dateString;
        const key = `${bucket}\u0000${mutation}`;
        const entry = pooled.get(key) ?? { date: bucket, mutation, count: 0, coverage: 0 };
        entry.count += frac * coverage;
        entry.coverage += coverage;
        pooled.set(key, entry);
    }
    return [...pooled.values()].map(({ date, mutation, count, coverage }) => ({
        date,
        mutation,
        frac: count / coverage,
    }));
}
