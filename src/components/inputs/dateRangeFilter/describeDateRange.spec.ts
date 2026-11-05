import { describe, expect, it } from 'vitest';

import { describeDateRange } from './DateRangeDropdown';

describe('describeDateRange', () => {
    it('names a preset with its dates, the year once if both are in it', () => {
        expect(describeDateRange({ label: 'Most recent 90 days', dateFrom: '2026-07-07', dateTo: '2026-10-04' })).toBe(
            'Most recent 90 days, Jul 7 – Oct 4, 2026',
        );
    });

    it('gives both years of a range across a new year, and its days', () => {
        expect(describeDateRange({ label: 'Custom', dateFrom: '2025-12-01', dateTo: '2026-02-03' })).toBe(
            'Dec 1, 2025 – Feb 3, 2026 (65 days)',
        );
    });

    it('counts a one-day custom range as one day', () => {
        expect(describeDateRange({ label: 'Custom', dateFrom: '2026-03-29', dateTo: '2026-03-29' })).toBe(
            'Mar 29, 2026 (1 day)',
        );
    });

    it('describes open ranges', () => {
        expect(describeDateRange({ label: 'All times', dateFrom: '2023-01-08' })).toBe('All times, since Jan 8, 2023');
        expect(describeDateRange({ label: 'Custom', dateTo: '2026-03-01' })).toBe('until Mar 1, 2026');
        expect(describeDateRange({ label: 'Custom' })).toBe('All dates');
    });
});
