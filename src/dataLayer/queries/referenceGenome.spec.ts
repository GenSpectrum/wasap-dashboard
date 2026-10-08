import { describe, expect, test } from 'vitest';

import { readReferenceGenome, referenceGenomeQuery } from './referenceGenome';

describe('the reference genome', () => {
    test('is the whole reference_genomes table', () => {
        expect(referenceGenomeQuery().render()).toBe('reference_genomes');
    });

    test('keeps the name and length of each segment and gene, in the order sent', () => {
        expect(
            readReferenceGenome([
                { name: 'main', sequence: 'ACGTACGT', type: 'nucleotide' },
                { name: 'S', sequence: 'MFV*', type: 'amino_acid' },
                { name: 'E', sequence: 'MY', type: 'amino_acid' },
            ]),
        ).toEqual({
            nucleotideSequences: [{ name: 'main', length: 8 }],
            genes: [
                { name: 'S', length: 4 },
                { name: 'E', length: 2 },
            ],
        });
    });

    test('an unknown type throws and names the column', () => {
        expect(() => readReferenceGenome([{ name: 'x', sequence: 'A', type: 'protein' }])).toThrow('type');
    });
});
