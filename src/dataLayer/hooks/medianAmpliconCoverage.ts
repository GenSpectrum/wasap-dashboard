/**
 * The median amplicon coverage of each sample, per location and week: a proxy for how much virus
 * the samples had.
 *
 * With little viral RNA in a sample, most amplicons don't amplify at all, and the few that do are
 * PCR copies of a handful of genomes — however many reads they have. So the median over a sample's
 * amplicons of their reads is high where most amplicons amplified and near 0 where most dropped
 * out. It is not a concentration (reads also depend on how deeply the sample was sequenced), but
 * it tells a sample whose proportions can be trusted from one where they can't.
 *
 * An amplicon's reads are counted at the middle of its core, like on the amplicon coverage page,
 * with one query per amplicon over the whole instance, grouped by sample (`positionBySampleQuery`).
 * The samples' locations and dates come from the overview's sample list.
 */

import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useConnection, useSiloSchema } from './connection';
import { unknownSymbol } from './mutationsOverTime';
import { useSampleOverview } from './sampleOverview';
import { type Amplicon } from '../../amplicons/primerBed';
import { samplingPositions } from '../../amplicons/samplingPositions';
import {
    generateAllInRange,
    getMinMaxTemporal,
    parseDateStringToTemporal,
    type TemporalClass,
} from '../../util/temporalClass';
import { positionBySampleQuery, readPositionBySample, type PositionBySampleRow, type SampleOverview } from '../queries';

/** An amplicon with at least this many reads in a sample counts as having amplified in it. */
export const AMPLIFIED_MIN_READS = 10;

export type SampleAmpliconCoverage = SampleOverview & {
    /** The median over all amplicons of the reads covering each. */
    medianAmpliconReads: number;
    /** How many amplicons have at least `AMPLIFIED_MIN_READS` reads. */
    amplifiedAmplicons: number;
};

/** One location in one week. */
export type AmpliconCoverageCell = {
    /** By sampling date. */
    samples: SampleAmpliconCoverage[];
    /** The median over the samples of their median amplicon reads; `null` without samples. */
    medianAmpliconReads: number | null;
};

export type MedianAmpliconCoverageGrid = {
    /** Sorted. */
    locations: string[];
    /** Every week from the first sample to the last, gap-filled. */
    weeks: TemporalClass[];
    /** Per location and week, index-aligned with `locations` and `weeks`. */
    cells: AmpliconCoverageCell[][];
    ampliconCount: number;
};

export type MedianAmpliconCoverageResult = {
    data: MedianAmpliconCoverageGrid | undefined;
    error: Error | undefined;
};

export function useMedianAmpliconCoverage(amplicons: Amplicon[]): MedianAmpliconCoverageResult {
    const connection = useConnection();
    const schema = useSiloSchema();
    const samples = useSampleOverview();

    const positions = useMemo(
        () => amplicons.map((amplicon) => samplingPositions(amplicon, amplicons, 1)[0]),
        [amplicons],
    );

    const results = useQueries({
        queries: positions.map((position) => {
            // `schema` stands in for `connection.key` (same memoized SiloInstance).
            // eslint-disable-next-line @tanstack/query/exhaustive-deps
            return {
                queryKey: ['silo', 'position-by-sample', ...connection.key, schema.nucleotideSequence, position],
                staleTime: Infinity,
                queryFn: async ({ signal }: { signal: AbortSignal }) => {
                    const { rows } = await connection.query(
                        positionBySampleQuery(schema, schema.nucleotideSequence, position),
                        `Position ${position} by sample`,
                        { signal },
                    );
                    return readPositionBySample(rows, schema.sampleId);
                },
            };
        }),
    });

    const counted = results.filter((result) => result.data !== undefined).length;
    const error = samples.error ?? results.find((result) => result.error)?.error ?? undefined;
    const answeredKey = results.map((result) => (result.data === undefined ? 0 : 1)).join('');

    const data = useMemo(() => {
        if (samples.data === undefined || counted < positions.length) {
            return undefined;
        }
        const coverages = sampleAmpliconCoverages(
            samples.data,
            results.map((result) => result.data!),
        );
        return medianAmpliconCoverageGrid(coverages, positions.length);
        // `answeredKey` stands in for `results`, which is a new array every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [samples.data, answeredKey, positions.length]);

    return { data, error: error ?? undefined };
}

/** Each sample's median amplicon reads, from one list of per-sample rows per amplicon (exported for tests). */
export function sampleAmpliconCoverages(
    samples: readonly SampleOverview[],
    rowsByAmplicon: readonly (readonly PositionBySampleRow[])[],
): SampleAmpliconCoverage[] {
    const unknown = unknownSymbol('nucleotide');
    const readsBySample = new Map(
        samples.map((sample) => [sample.sampleId, new Array<number>(rowsByAmplicon.length).fill(0)]),
    );
    rowsByAmplicon.forEach((rows, ampliconIndex) => {
        for (const row of rows) {
            if (row.sym !== null && row.sym !== '' && row.sym !== unknown) {
                const reads = readsBySample.get(row.sampleId);
                if (reads !== undefined) {
                    reads[ampliconIndex] += row.count;
                }
            }
        }
    });
    return samples.map((sample) => {
        const reads = readsBySample.get(sample.sampleId)!;
        return {
            ...sample,
            medianAmpliconReads: median(reads),
            amplifiedAmplicons: reads.filter((count) => count >= AMPLIFIED_MIN_READS).length,
        };
    });
}

/** The samples by location and week, and each cell's median (exported for tests). */
export function medianAmpliconCoverageGrid(
    samples: readonly SampleAmpliconCoverage[],
    ampliconCount: number,
): MedianAmpliconCoverageGrid {
    const locations = [...new Set(samples.map((sample) => sample.locationName))].sort();
    if (samples.length === 0) {
        return { locations, weeks: [], cells: [], ampliconCount };
    }
    const weekOf = (sample: SampleAmpliconCoverage) => parseDateStringToTemporal(sample.date, 'week');
    const { min, max } = getMinMaxTemporal(samples.map(weekOf));
    const weeks = generateAllInRange(min, max);
    const weekIndex = new Map(weeks.map((week, index) => [week.dateString, index]));
    const locationIndex = new Map(locations.map((location, index) => [location, index]));

    const samplesByCell = locations.map(() => weeks.map((): SampleAmpliconCoverage[] => []));
    for (const sample of samples) {
        samplesByCell[locationIndex.get(sample.locationName)!][weekIndex.get(weekOf(sample).dateString)!].push(sample);
    }
    const cells = samplesByCell.map((row) =>
        row.map((cellSamples) => ({
            samples: [...cellSamples].sort((a, b) => a.date.localeCompare(b.date)),
            medianAmpliconReads:
                cellSamples.length === 0 ? null : median(cellSamples.map((sample) => sample.medianAmpliconReads)),
        })),
    );
    return { locations, weeks, cells, ampliconCount };
}

function median(values: readonly number[]): number {
    if (values.length === 0) {
        return 0;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
