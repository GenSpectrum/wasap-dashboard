import { useSyncExternalStore } from 'react';
import { z } from 'zod';

import { type ColorScale } from './color-scale-selector';

/**
 * How the bands are drawn, as opposed to which data they show. These are the user's own preferences: they
 * are kept in the browser's local storage, not in the URL, so they persist but aren't part of a shared link.
 */
export type BandViewSettings = {
    colorScale: ColorScale;
    /** Print the proportion of each bucket over the band. */
    showPercentages: boolean;
    /** Show the dates without any samples as empty columns, rather than leaving them out. */
    showEmptyDates: boolean;
};

export const DEFAULT_BAND_VIEW_SETTINGS: BandViewSettings = {
    colorScale: { color: 'indigo', root: 2 },
    showPercentages: false,
    showEmptyDates: false,
};

const STORAGE_KEY = 'wasap.bandViewSettings';

/** Only what the user can change is stored. A field that is missing or invalid falls back to its default. */
const storedSettingsSchema = z.object({
    colorScaleRoot: z.number().catch(DEFAULT_BAND_VIEW_SETTINGS.colorScale.root),
    showPercentages: z.boolean().catch(DEFAULT_BAND_VIEW_SETTINGS.showPercentages),
    showEmptyDates: z.boolean().catch(DEFAULT_BAND_VIEW_SETTINGS.showEmptyDates),
});

export function readStoredBandViewSettings(): BandViewSettings {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === null) {
            return DEFAULT_BAND_VIEW_SETTINGS;
        }
        const parsed = storedSettingsSchema.parse(JSON.parse(stored));
        return {
            colorScale: { ...DEFAULT_BAND_VIEW_SETTINGS.colorScale, root: parsed.colorScaleRoot },
            showPercentages: parsed.showPercentages,
            showEmptyDates: parsed.showEmptyDates,
        };
    } catch {
        // Storage can be unavailable (e.g. blocked by the browser), or hold something that isn't JSON.
        return DEFAULT_BAND_VIEW_SETTINGS;
    }
}

function writeStoredSettings(settings: BandViewSettings) {
    const toStore: z.infer<typeof storedSettingsSchema> = {
        colorScaleRoot: settings.colorScale.root,
        showPercentages: settings.showPercentages,
        showEmptyDates: settings.showEmptyDates,
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
        // Then the settings still apply until the page is reloaded, they just aren't kept.
    }
}

// The settings are shared by all the panels on the page, so a change in one applies to all of them.
let current: BandViewSettings | undefined;
const listeners = new Set<() => void>();

function getSnapshot(): BandViewSettings {
    current ??= readStoredBandViewSettings();
    return current;
}

function setBandViewSettings(settings: BandViewSettings) {
    current = settings;
    writeStoredSettings(settings);
    listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
    // A change made in another tab.
    if (event.key === STORAGE_KEY || event.key === null) {
        current = readStoredBandViewSettings();
        listeners.forEach((listener) => listener());
    }
}

function subscribe(listener: () => void) {
    if (listeners.size === 0) {
        window.addEventListener('storage', onStorage);
    }
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
            window.removeEventListener('storage', onStorage);
        }
    };
}

export function useBandViewSettings(): [BandViewSettings, (settings: BandViewSettings) => void] {
    const settings = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_BAND_VIEW_SETTINGS);
    return [settings, setBandViewSettings];
}
