import { describe, expect, test } from 'vitest';

import { bandSegments, jaccardIndexShading } from './feature-bands';

describe('jaccardIndexShading', () => {
    test('shades a Jaccard index of .8 and above green, darker from .9', () => {
        expect(jaccardIndexShading(undefined)).toBe('');
        expect(jaccardIndexShading(0.79)).toBe('');
        expect(jaccardIndexShading(0.8)).toBe('bg-green-100');
        expect(jaccardIndexShading(0.89)).toBe('bg-green-100');
        expect(jaccardIndexShading(0.9)).toBe('bg-green-200');
        expect(jaccardIndexShading(1)).toBe('bg-green-200');
    });
});

/** The knots with their positions rounded, which a third of a column isn't exactly. */
function rounded(halves: number[], width: number) {
    return bandSegments(halves, width).map((knots) =>
        knots.map(({ x, half }) => ({ x: Math.round(x * 1e6) / 1e6, half })),
    );
}

describe('bandSegments', () => {
    test('is straight in the middle third of each bucket, tapering from nothing at the ends of the row', () => {
        expect(rounded([2, 4], 30)).toEqual([
            [
                { x: 0, half: 0 },
                { x: 10, half: 2 },
                { x: 20, half: 2 },
                { x: 40, half: 4 },
                { x: 50, half: 4 },
                { x: 60, half: 0 },
            ],
        ]);
    });

    test('is cut off square at the edge of a bucket without coverage', () => {
        expect(rounded([0, 3, 0], 30)).toEqual([
            [
                { x: 30, half: 3 },
                { x: 40, half: 3 },
                { x: 50, half: 3 },
                { x: 60, half: 3 },
            ],
        ]);
    });
});
