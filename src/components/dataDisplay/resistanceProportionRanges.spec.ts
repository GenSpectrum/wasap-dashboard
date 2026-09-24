import { describe, expect, it } from 'vitest';

import { countByProportionRange } from './resistanceProportionRanges';

describe('countByProportionRange', () => {
    it('counts every mean proportion in exactly one range, besides all', () => {
        const counts = countByProportionRange([0, 0.005, 0.01, 0.5, 0.99, 0.995, 1]);

        expect(counts).toEqual({ all: 7, low: 2, medium: 3, high: 2 });
    });

    it('counts nothing for no mutations', () => {
        expect(countByProportionRange([])).toEqual({ all: 0, low: 0, medium: 0, high: 0 });
    });
});
