import { describe, expect, test } from 'vitest';

import { effectivePositionRange } from './positionRange';
import { type WasapManualFilter } from './wasapAnalysisFilter';

const main = { name: 'main', sequence: 'ACGTACGTAC', length: 10 };
const S = { name: 'S', sequence: 'MFVFL', length: 5 };
const E = { name: 'E', sequence: 'MYSFV', length: 5 };
const referenceGenome = { nucleotideSequences: [main], genes: [S, E] };

const range = (analysis: Omit<WasapManualFilter, 'mode'>) =>
    effectivePositionRange({ mode: 'manual', ...analysis }, referenceGenome, 'main');

describe('effectivePositionRange', () => {
    test('is in the nucleotide sequence for nucleotides', () => {
        expect(range({ sequenceType: 'nucleotide', rangeStart: 3, rangeLength: 4 })).toEqual({
            reference: main,
            start: 3,
            length: 4,
        });
    });

    test('is in the picked gene for amino acids, or the first one', () => {
        expect(range({ sequenceType: 'amino acid', rangeGene: 'E', rangeLength: 2 })?.reference).toBe(E);
        expect(range({ sequenceType: 'amino acid', rangeLength: 2 })?.reference).toBe(S);
        expect(range({ sequenceType: 'amino acid', rangeGene: 'ORF9', rangeLength: 2 })?.reference).toBe(S);
    });

    test('is cut to the sequence and moved back into it', () => {
        expect(range({ sequenceType: 'amino acid', rangeStart: 2, rangeLength: 50 })).toEqual({
            reference: S,
            start: 1,
            length: 5,
        });
        expect(range({ sequenceType: 'nucleotide', rangeStart: 9, rangeLength: 4 })).toEqual({
            reference: main,
            start: 7,
            length: 4,
        });
    });

    test('is undefined without such a sequence', () => {
        expect(
            effectivePositionRange({ mode: 'manual', sequenceType: 'nucleotide' }, referenceGenome, 'other'),
        ).toBeUndefined();
    });
});
