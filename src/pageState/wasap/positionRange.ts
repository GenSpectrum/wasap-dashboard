import { type UseQueryResult } from '@tanstack/react-query';

import { type WasapManualFilter } from './wasapAnalysisFilter';
import { useRhydbSchema } from '../../dataLayer/hooks/connection';
import { useReferenceGenome } from '../../dataLayer/hooks/lookups/referenceGenome';
import { type PositionRange, type ReferenceGenome } from '../../dataLayer/queries';

/** The length of the position range of the manual mode when none is picked. */
export const DEFAULT_POSITION_RANGE_LENGTH = 50;

/**
 * The position range of the manual mode, fitted into its sequence: the picked gene for amino acids
 * (the first one if none or an unknown one is picked), the nucleotide sequence otherwise. It starts
 * at `rangeStart` (1 without) and is `rangeLength` long (`DEFAULT_POSITION_RANGE_LENGTH` without),
 * cut to the sequence's length and moved back to end at the sequence's end at the latest.
 * `undefined` if the reference has no such sequence.
 */
export function effectivePositionRange(
    analysis: WasapManualFilter,
    referenceGenome: ReferenceGenome,
    nucleotideSequence: string,
): PositionRange | undefined {
    const reference =
        analysis.sequenceType === 'nucleotide'
            ? referenceGenome.nucleotideSequences.find((sequence) => sequence.name === nucleotideSequence)
            : (referenceGenome.genes.find((gene) => gene.name === analysis.rangeGene) ?? referenceGenome.genes[0]);
    if (reference === undefined || reference.length === 0) {
        return undefined;
    }
    const length = Math.min(analysis.rangeLength ?? DEFAULT_POSITION_RANGE_LENGTH, reference.length);
    const start = Math.min(analysis.rangeStart ?? 1, reference.length - length + 1);
    return { reference, start, length };
}

/**
 * The position range of the manual mode (`effectivePositionRange`), with the reference genome it
 * is fitted into: `range` is `undefined` while that loads, or if the reference has no such sequence.
 */
export function usePositionRange(analysis: WasapManualFilter): {
    referenceGenome: UseQueryResult<ReferenceGenome>;
    range: PositionRange | undefined;
} {
    const referenceGenome = useReferenceGenome();
    const schema = useRhydbSchema();
    const range =
        referenceGenome.data === undefined
            ? undefined
            : effectivePositionRange(analysis, referenceGenome.data, schema.nucleotideSequence);
    return { referenceGenome, range };
}
