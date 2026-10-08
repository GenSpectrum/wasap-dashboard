import z from 'zod';

const referenceSequence = z.object({
    name: z.string(),
    sequence: z.string(),
});

export const referenceGenomeResponse = z.object({
    nucleotideSequences: z.array(referenceSequence),
    genes: z.array(referenceSequence),
});

/** A segment or gene of the reference, by name and length. Nothing reads its symbols. */
export type ReferenceSequence = { name: string; length: number };

export type ReferenceGenome = {
    nucleotideSequences: ReferenceSequence[];
    genes: ReferenceSequence[];
};

export const isSingleSegmented = (referenceGenome: ReferenceGenome) => referenceGenome.nucleotideSequences.length === 1;
