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
 * in one query over the whole instance, grouped by sample (`positionsBySampleQuery`).
 * The samples' locations and dates come from the overview's sample list.
 */

import { useMemo } from 'react';

import { useConnection, useRhydbSchema } from '../connection';
import { unknownSymbol } from './mutationsOverTime';
import { type Amplicon } from '../../../externalData/fileBased/amplicons/primerBed';
import { samplingPositions } from '../../../externalData/fileBased/amplicons/samplingPositions';
import {
    generateAllInRange,
    getMinMaxTemporal,
    parseDateStringToTemporal,
    type TemporalClass,
} from '../../../util/temporal';
import {
    positionsBySampleQuery,
    readPositionsBySample,
    type PositionBySampleRow,
    type SampleOverview,
} from '../../queries';
import { useSampleOverview } from '../lookups/sampleOverview';
import { useRhydbQuery } from '../rhydbQuery';

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
    const schema = useRhydbSchema();
    const samples = useSampleOverview();

    const positions = useMemo(
        () => amplicons.map((amplicon) => samplingPositions(amplicon, amplicons, 1)[0]),
        [amplicons],
    );

    // `schema` stands in for `connection.key` (same memoized RhydbInstance).
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    const positionRows = useRhydbQuery({
        queryKey: ['rhydb', 'positions-by-sample', ...connection.key, schema.nucleotideSequence, positions],
        staleTime: Infinity,
        queryFn: async ({ signal }) => {
            if (positions.length === 0) {
                return [];
            }
            const { rows } = await connection.query(
                positionsBySampleQuery(schema, schema.nucleotideSequence, positions),
                `${positions.length} amplicon positions by sample`,
                { signal },
            );
            return readPositionsBySample(rows, schema.sampleId);
        },
    });

    const error = samples.error ?? positionRows.error;
    const rows = positionRows.data;

    const data = useMemo(
        () =>
            samples.data &&
            rows &&
            medianAmpliconCoverageGrid(sampleAmpliconCoverages(samples.data, positions, rows), positions.length),
        [samples.data, positions, rows],
    );

    return { data, error: error ?? undefined };
}

/**
 * Each sample's median amplicon reads, from the per-sample rows at each amplicon's position
 * (exported for tests).
 */
export function sampleAmpliconCoverages(
    samples: readonly SampleOverview[],
    positions: readonly number[],
    rows: readonly PositionBySampleRow[],
): SampleAmpliconCoverage[] {
    const unknown = unknownSymbol('nucleotide');
    const ampliconIndex = new Map(positions.map((position, index) => [position, index]));
    const readsBySample = new Map(
        samples.map((sample) => [sample.sampleId, new Array<number>(positions.length).fill(0)]),
    );
    for (const row of rows) {
        const reads = readsBySample.get(row.sampleId);
        const index = ampliconIndex.get(row.position);
        if (row.sym !== null && row.sym !== '' && row.sym !== unknown && reads !== undefined && index !== undefined) {
            reads[index] += row.count;
        }
    }
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
