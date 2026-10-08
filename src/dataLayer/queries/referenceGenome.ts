/**
 * The reference genome of an instance: the names and lengths of its segments and genes.
 *
 * Every instance holds it in a `reference_genomes` table, one row per segment
 * or gene, next to the reads. The table has no column for the length, and the
 * language no function to compute it, so the sequences are fetched and only
 * their lengths kept.
 */

import { table, type Queryable } from '../transport/relation';
import { readText, RhydbRowError, type RhydbRow } from '../transport/row';

/** A segment or gene of the reference, by name and length. Nothing reads its symbols. */
export type ReferenceSequence = { name: string; length: number };

export type ReferenceGenome = {
    nucleotideSequences: ReferenceSequence[];
    genes: ReferenceSequence[];
};

export const isSingleSegmented = (referenceGenome: ReferenceGenome) => referenceGenome.nucleotideSequences.length === 1;

export function referenceGenomeQuery(): Queryable {
    return table('reference_genomes');
}

/** The rows of `referenceGenomeQuery`, in the order the instance sent them. */
export function readReferenceGenome(rows: readonly RhydbRow[]): ReferenceGenome {
    const referenceGenome: ReferenceGenome = { nucleotideSequences: [], genes: [] };
    for (const row of rows) {
        const sequence = { name: readText(row, 'name'), length: readText(row, 'sequence').length };
        const type = readText(row, 'type');
        switch (type) {
            case 'nucleotide':
                referenceGenome.nucleotideSequences.push(sequence);
                break;
            case 'amino_acid':
                referenceGenome.genes.push(sequence);
                break;
            default:
                throw new RhydbRowError('type', `expected nucleotide or amino_acid, got ${JSON.stringify(type)}`);
        }
    }
    return referenceGenome;
}
