import { describe, expect, it } from 'vitest';

import { signatureOverlap } from './signatureOverlap';

describe('signatureOverlap', () => {
    it('counts shared and unique mutations pair by pair', () => {
        const overlap = signatureOverlap({
            A: ['C1T', 'C2T', 'C3T'],
            B: ['C1T', 'C2T', 'C4T'],
            C: ['C1T'],
        });

        expect(overlap.lineages).toEqual(['A', 'B', 'C']);
        expect(overlap.sizes).toEqual([3, 3, 1]);
        expect(overlap.shared).toEqual([
            [3, 2, 1],
            [2, 3, 1],
            [1, 1, 1],
        ]);
        expect(overlap.jaccard[0][1]).toBeCloseTo(2 / 4);
        expect(overlap.jaccard[0][2]).toBeCloseTo(1 / 3);
        expect(overlap.jaccard[2][2]).toBe(1);
        expect(overlap.unique).toEqual([['C3T'], ['C4T'], []]);
    });

    it('treats two empty signatures as the same', () => {
        expect(signatureOverlap({ A: [], B: [] }).jaccard[0][1]).toBe(1);
    });
});
