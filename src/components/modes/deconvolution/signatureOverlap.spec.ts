import { describe, expect, it } from 'vitest';

import { distinguishingMutations, signatureOverlap } from './signatureOverlap';

describe('signatureOverlap', () => {
    it('counts shared, distinguishing and unique mutations pair by pair', () => {
        const overlap = signatureOverlap({
            A: ['C0T', 'C1T', 'C2T', 'C3T'],
            B: ['C0T', 'C1T', 'C2T', 'C4T'],
            C: ['C0T', 'C1T', 'C5T'],
        });

        expect(overlap.lineages).toEqual(['A', 'B', 'C']);
        expect(overlap.sizes).toEqual([4, 4, 3]);
        expect(overlap.shared).toEqual([
            [4, 3, 2],
            [3, 4, 2],
            [2, 2, 3],
        ]);
        expect(overlap.distinguishing).toEqual([
            [0, 2, 3],
            [2, 0, 3],
            [3, 3, 0],
        ]);
        expect(overlap.unique).toEqual([['C3T'], ['C4T'], ['C5T']]);
    });

    it('lists the distinguishing mutations of a pair by position', () => {
        const overlap = signatureOverlap({
            A: ['C10T', 'C2T', 'C3T'],
            B: ['C2T', 'C1T'],
        });

        expect(distinguishingMutations(overlap, 0, 1)).toEqual(['C1T', 'C3T', 'C10T']);
        expect(distinguishingMutations(overlap, 1, 0)).toEqual(['C1T', 'C3T', 'C10T']);
    });
});
