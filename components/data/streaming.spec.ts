import { describe, expect, test } from 'vitest';

import { answeredPrefix } from './streaming';

type Point = { position: number };
const point = (position: number): Point => ({ position });

describe('answeredPrefix', () => {
    test('all answered is every point, in the order they were asked for', () => {
        expect(answeredPrefix([point(1), point(11), point(21)])).toEqual([point(1), point(11), point(21)]);
    });

    test('stops at the first hole, so the curve never doubles back', () => {
        // A pool answers in completion order, so only the run before the
        // first hole may be published.
        expect(answeredPrefix([point(1), undefined, point(21)])).toEqual([point(1)]);
    });

    test('nothing answered yet is nothing to draw', () => {
        expect(answeredPrefix([undefined, point(11)])).toEqual([]);
        expect(answeredPrefix([])).toEqual([]);
    });

    test('the prefix is always a prefix of the questions asked', () => {
        const prefix = answeredPrefix([point(1), point(11), undefined, point(31), point(41)]);
        expect(prefix.map((entry) => entry.position)).toEqual([1, 11]);
    });
});
