/**
 * The samples the instance holds, for the overview page: as they are, and folded into one entry
 * per location. Both read off the same cached query.
 */

import { type UseQueryResult } from '@tanstack/react-query';

import { readSampleOverview, sampleOverviewQuery, type SampleOverview } from '../../queries';
import { useConnection, useRhydbSchema } from '../connection';
import { useRhydbQuery } from '../rhydbQuery';

/**
 * Every sample the instance holds, one entry each — its location, sampling date, batch and read
 * count. Used as is by the overview page's samples-over-time plot; `useLocationOverview` reads off
 * the same cached query.
 */
export function useSampleOverview(): UseQueryResult<SampleOverview[]> {
    return useSampleOverviewQuery();
}

/** `useSampleOverview` folded into one entry per location, for the overview page's per-location table. */
export function useLocationOverview(): UseQueryResult<LocationOverview[]> {
    return useSampleOverviewQuery(readLocationOverview);
}

function useSampleOverviewQuery<T = SampleOverview[]>(select?: (samples: SampleOverview[]) => T): UseQueryResult<T> {
    const connection = useConnection();
    const schema = useRhydbSchema();
    // `schema` stands in for `connection.key` (same memoized RhydbInstance).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    return useRhydbQuery({
        queryKey: ['rhydb', 'sample-overview', ...connection.key],
        queryFn: async ({ signal }) => {
            const { rows } = await connection.query(sampleOverviewQuery(schema), 'Sample overview', { signal });
            return readSampleOverview(rows, schema);
        },
        select,
    });
}

export type LocationOverview = {
    name: string;
    sampleCount: number;
    /** The reads (amplicon sequences) of all its samples together. */
    totalReads: number;
    /** The sampling date of the most recently collected sample at this location. */
    mostRecentSampleDate: string;
};

/**
 * `readSampleOverview`'s one-entry-per-sample result, folded into one entry per location — how
 * many samples it has, how many reads they have together, and the most recent of their sampling
 * dates. Sorted by location name.
 */
export function readLocationOverview(samples: readonly SampleOverview[]): LocationOverview[] {
    const byLocation = new Map<string, { sampleCount: number; totalReads: number; mostRecentSampleDate: string }>();
    for (const sample of samples) {
        const existing = byLocation.get(sample.locationName);
        if (existing === undefined) {
            byLocation.set(sample.locationName, {
                sampleCount: 1,
                totalReads: sample.reads,
                mostRecentSampleDate: sample.date,
            });
        } else {
            existing.sampleCount += 1;
            existing.totalReads += sample.reads;
            if (sample.date > existing.mostRecentSampleDate) {
                existing.mostRecentSampleDate = sample.date;
            }
        }
    }
    return [...byLocation.entries()]
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => a.name.localeCompare(b.name));
}
