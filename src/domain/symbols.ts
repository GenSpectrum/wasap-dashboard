import { type SequenceType } from './mutations';

/** The symbol of a read that doesn't cover a position: `N` for nucleotides, `X` for amino acids. */
export function unknownSymbol(sequenceType: SequenceType): string {
    return sequenceType === 'nucleotide' ? 'N' : 'X';
}

/**
 * The nucleotide symbols that count as covering a position for the deconvolution: the bases and a
 * deletion, not ambiguity codes. The over-time grids count every symbol but `unknownSymbol` instead.
 */
export const COVERING_NUCLEOTIDES: ReadonlySet<string> = new Set(['A', 'C', 'G', 'T', '-']);
