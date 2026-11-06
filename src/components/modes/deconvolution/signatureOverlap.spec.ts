import { describe, expect, it } from 'vitest';

import { signatureOverlap } from './signatureOverlap';

describe('signatureOverlap', () => {
    it('counts shared and unique mutations pair by pair, without the common ones', () => {
        const overlap = signatureOverlap({
            A: ['C0T', 'C1T', 'C2T', 'C3T'],
            B: ['C0T', 'C1T', 'C2T', 'C4T'],
            C: ['C0T', 'C1T', 'C5T'],
        });

        expect(overlap.lineages).toEqual(['A', 'B', 'C']);
        expect(overlap.common).toEqual(['C0T', 'C1T']);
        expect(overlap.totalSizes).toEqual([4, 4, 3]);
        expect(overlap.sizes).toEqual([2, 2, 1]);
        expect(overlap.shared).toEqual([
            [2, 1, 0],
            [1, 2, 0],
            [0, 0, 1],
        ]);
        expect(overlap.distinguishing).toEqual([
            [0, 2, 3],
            [2, 0, 3],
            [3, 3, 0],
        ]);
        expect(overlap.unique).toEqual([['C3T'], ['C4T'], ['C5T']]);
    });
});
