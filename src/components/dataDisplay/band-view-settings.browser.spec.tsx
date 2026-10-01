import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_BAND_VIEW_SETTINGS, readStoredBandViewSettings, useBandViewSettings } from './band-view-settings';

const STORAGE_KEY = 'wasap.bandViewSettings';

describe('band view settings', () => {
    afterEach(() => {
        const { result } = renderHook(() => useBandViewSettings());
        act(() => result.current[1](DEFAULT_BAND_VIEW_SETTINGS));
        localStorage.removeItem(STORAGE_KEY);
    });

    it('stores a change in local storage and applies it to every panel', () => {
        const first = renderHook(() => useBandViewSettings());
        const second = renderHook(() => useBandViewSettings());

        act(() =>
            first.result.current[1]({
                colorScale: { ...DEFAULT_BAND_VIEW_SETTINGS.colorScale, root: 3.5 },
                showPercentages: true,
                showEmptyDates: true,
            }),
        );

        expect(second.result.current[0].showPercentages).toBe(true);
        expect(second.result.current[0].colorScale.root).toBe(3.5);
        expect(second.result.current[0].showEmptyDates).toBe(true);
        expect(readStoredBandViewSettings()).toEqual(second.result.current[0]);
    });

    it('falls back to the defaults for what is missing or invalid in storage', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ showPercentages: true, colorScaleRoot: 'high' }));
        expect(readStoredBandViewSettings()).toEqual({ ...DEFAULT_BAND_VIEW_SETTINGS, showPercentages: true });

        localStorage.setItem(STORAGE_KEY, 'not json');
        expect(readStoredBandViewSettings()).toEqual(DEFAULT_BAND_VIEW_SETTINGS);
    });
});
