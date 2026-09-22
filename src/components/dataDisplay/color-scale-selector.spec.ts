import { describe, expect, test } from 'vitest';

import { type ColorScale, getColorWithinScale } from './color-scale-selector';

const scale: ColorScale = { min: 0, max: 1, color: 'indigo' };

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

    test('is transparent at the minimum of the scale, and below it', () => {
        expect(opacityOf(getColorWithinScale(0, scale))).toBe(0);
        expect(opacityOf(getColorWithinScale(0.2, { ...scale, min: 0.5 }))).toBe(0);
    });

    test('is fully opaque at the maximum of the scale, and above it', () => {
        expect(opacityOf(getColorWithinScale(1, scale))).toBe(1);
        expect(opacityOf(getColorWithinScale(0.3, { ...scale, max: 0.2 }))).toBe(1);
    });

    test('keeps low proportions visible: 1% of the maximum is already about a third opaque', () => {
        expect(opacityOf(getColorWithinScale(0.01, scale))).toBeCloseTo(0.316, 3);
        expect(opacityOf(getColorWithinScale(0.0001, scale))).toBeCloseTo(0.1, 3);
    });

    test('follows the fourth root of the position between the minimum and the maximum', () => {
        const between: ColorScale = { min: 0.5, max: 1, color: 'indigo' };

        expect(opacityOf(getColorWithinScale(0.75, between))).toBeCloseTo(0.5 ** 0.25, 6);
    });

    test('is a step at the maximum when the scale has no range', () => {
        const noRange: ColorScale = { min: 0.4, max: 0.4, color: 'indigo' };

        expect(opacityOf(getColorWithinScale(0.39, noRange))).toBe(0);
        expect(opacityOf(getColorWithinScale(0.4, noRange))).toBe(1);
    });
});
