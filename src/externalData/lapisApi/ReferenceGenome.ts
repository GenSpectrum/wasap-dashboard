import z from 'zod';

export const referenceGenomeResponse = z.object({
    nucleotideSequences: z.array(
        z.object({
            name: z.string(),
            sequence: z.string(),
        }),
    ),
    genes: z.array(
        z.object({
            name: z.string(),
            sequence: z.string(),
        }),
    ),
});
export type ReferenceGenome = z.infer<typeof referenceGenomeResponse>;

export const isSingleSegmented = (referenceGenome: ReferenceGenome) => referenceGenome.nucleotideSequences.length === 1;
