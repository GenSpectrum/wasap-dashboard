import { describe, expect, test } from 'vitest';

import { type ColorScale, getColorWithinScale } from './color-scale-selector';

const scale: ColorScale = { color: 'indigo', root: 4 };

function opacityOf(color: string): number {
    const match = /^rgba\(51,34,136,(.+)\)$/.exec(color);
    if (match === null) {
        throw new Error(`Not the indigo fill: ${color}`);
    }
    return Number(match[1]);
}

describe('getColorWithinScale', () => {
    test('is grey for a value that was not measured', () => {
        expect(getColorWithinScale(undefined, scale)).toBe('lightgrey');
    });

    test('is transparent at a proportion of 0', () => {
        expect(opacityOf(getColorWithinScale(0, scale))).toBe(0);
    });

    test('is fully opaque at a proportion of 1', () => {
        expect(opacityOf(getColorWithinScale(1, scale))).toBe(1);
    });

    test('with the fourth root, 1% is already about a third opaque', () => {
        expect(opacityOf(getColorWithinScale(0.01, scale))).toBeCloseTo(0.316, 3);
        expect(opacityOf(getColorWithinScale(0.0001, scale))).toBeCloseTo(0.1, 3);
    });

    test('with the square root, 0.01% is next to invisible', () => {
        expect(opacityOf(getColorWithinScale(0.01, { ...scale, root: 2 }))).toBeCloseTo(0.1, 3);
        expect(opacityOf(getColorWithinScale(0.0001, { ...scale, root: 2 }))).toBeCloseTo(0.01, 3);
    });

    test('is linear with a root of 1', () => {
        expect(opacityOf(getColorWithinScale(0.3, { ...scale, root: 1 }))).toBeCloseTo(0.3, 6);
    });

    test('follows the root of the proportion', () => {
        expect(opacityOf(getColorWithinScale(0.5, { ...scale, root: 3 }))).toBeCloseTo(0.5 ** (1 / 3), 6);
    });
});
