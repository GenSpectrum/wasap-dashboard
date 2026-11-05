import { describe, expect, it } from 'vitest';

import { resolveDateRange } from './dateRange';

const options = [
    { label: 'Last week', dateFrom: '2026-06-24', dateTo: '2026-06-30' },
    { label: 'All times', dateFrom: '2023-01-08' },
];

describe('resolveDateRange', () => {
    it('gives a preset named by its label its dates', () => {
        expect(resolveDateRange({ label: 'Last week' }, options)).toEqual(options[0]);
    });

    it('takes a custom range with the dates of a preset for the preset', () => {
        expect(resolveDateRange({ label: 'Custom', dateFrom: '2026-06-24', dateTo: '2026-06-30' }, options)).toEqual(
            options[0],
        );
    });

    it('keeps any other custom range', () => {
        const custom = { label: 'Custom', dateFrom: '2026-06-01', dateTo: '2026-06-30' };
        expect(resolveDateRange(custom, options)).toBe(custom);
    });

    it('falls back to "All times" for a label that names no preset', () => {
        expect(resolveDateRange({ label: 'Most recent 999 days' }, options)).toEqual(options[1]);
        expect(resolveDateRange({ label: 'Most recent 999 days' }, [])).toEqual({ label: 'All times' });
    });
});
