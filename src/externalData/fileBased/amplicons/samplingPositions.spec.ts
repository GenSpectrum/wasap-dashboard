import { describe, expect, test } from 'vitest';

import { type Amplicon } from './primerBed';
import { insertCore, samplingPositions } from './samplingPositions';

function amplicon(number: number, insertStart: number, insertEnd: number, chrom = 'ref'): Amplicon {
    return {
        chrom,
        number,
        pool: String(((number + 1) % 2) + 1),
        start: insertStart - 20,
        end: insertEnd + 20,
        insertStart,
        insertEnd,
    };
}

describe('insertCore', () => {
    test('leaves out the parts of the insert that the neighbouring inserts overlap', () => {
        const amplicons = [amplicon(1, 100, 400), amplicon(2, 350, 700), amplicon(3, 650, 1000)];

        expect(insertCore(amplicons[0], amplicons)).toEqual({ start: 100, end: 349 });
        expect(insertCore(amplicons[1], amplicons)).toEqual({ start: 401, end: 649 });
        expect(insertCore(amplicons[2], amplicons)).toEqual({ start: 701, end: 1000 });
    });

    test('ignores amplicons on another reference sequence', () => {
        const amplicons = [amplicon(1, 100, 400), amplicon(1, 100, 400, 'other')];

        expect(insertCore(amplicons[0], amplicons)).toEqual({ start: 100, end: 400 });
    });

    test('is the whole insert if other inserts cover all of it', () => {
        const amplicons = [amplicon(1, 100, 200), amplicon(2, 50, 300)];

        expect(insertCore(amplicons[0], amplicons)).toEqual({ start: 100, end: 200 });
    });
});

describe('samplingPositions', () => {
    test('spreads the positions evenly across the core', () => {
        const amplicons = [amplicon(1, 101, 400), amplicon(2, 301, 700)];

        expect(samplingPositions(amplicons[0], amplicons, 3)).toEqual([150, 200, 250]);
    });

    test('takes every position of a core shorter than the count', () => {
        const amplicons = [amplicon(1, 100, 101)];

        expect(samplingPositions(amplicons[0], amplicons, 3)).toEqual([100, 101]);
    });

    test('takes the middle of the core by default', () => {
        const amplicons = [amplicon(1, 101, 400), amplicon(2, 301, 700)];

        expect(samplingPositions(amplicons[0], amplicons)).toEqual([200]);
    });
});
