import { describe, expect, test } from 'vitest';

import { readCount, readNumber, readOptionalText, readText, RhydbRowError } from './row';

describe('reading a row', () => {
    const row = { sampleId: 'S1', sym: null, n: 8120, proportion: 0.05, big: '9007199254740993' };

    test('text, present and not null', () => {
        expect(readText(row, 'sampleId')).toBe('S1');
        expect(() => readText(row, 'sym')).toThrow(RhydbRowError);
        expect(() => readText(row, 'missing')).toThrow(RhydbRowError);
    });

    test('null is data, an absent column is a mistake', () => {
        expect(readOptionalText(row, 'sym')).toBeNull();
        expect(readOptionalText(row, 'sampleId')).toBe('S1');
        expect(() => readOptionalText(row, 'missing')).toThrow(RhydbRowError);
    });

    test('counts are non-negative integers', () => {
        expect(readCount(row, 'n')).toBe(8120);
        expect(readCount({ n: 0 }, 'n')).toBe(0);
        expect(() => readCount({ n: -1 }, 'n')).toThrow(RhydbRowError);
        expect(() => readCount({ n: 1.5 }, 'n')).toThrow(RhydbRowError);
        expect(() => readCount({}, 'n')).toThrow(RhydbRowError);
    });

    test('numbers, including ones an encoder sent as text to keep their precision', () => {
        expect(readNumber(row, 'proportion')).toBe(0.05);
        // FIXME: this doesn't actually test what the `describe` block above claims —
        // `readNumber` calls `Number(value)` on the string, which rounds exactly like
        // this literal does, so both sides round to 9007199254740992 and the assertion
        // passes without proving precision was preserved. Pre-existing; flagged by
        // @typescript-eslint/no-loss-of-precision, not fixed here (would mean changing
        // `readNumber`'s production behaviour, out of scope for a lint-config change).
        // eslint-disable-next-line no-loss-of-precision
        expect(readNumber(row, 'big')).toBe(9007199254740993);
        expect(() => readNumber({ n: 'many' }, 'n')).toThrow(RhydbRowError);
        expect(() => readNumber({ n: null }, 'n')).toThrow(RhydbRowError);
    });

    test('the error names the column, since that is what a reader/query mismatch needs', () => {
        expect(() => readCount(row, 'reads')).toThrow(/"reads"/);
        expect(() => readCount(row, 'reads')).toThrow(/no such column/);
    });
});
