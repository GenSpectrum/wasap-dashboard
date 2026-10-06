import { describe, expect, test } from 'vitest';

import { jaccardIndexShading } from './feature-bands';

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
