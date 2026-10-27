import { describe, expect, it } from 'vitest';

import { ANALYSIS_MODE } from './analysisFilter';
import { modeLabel, modeToSegment, segmentToMode } from './modes';

describe('modes', () => {
    const modes = Object.values(ANALYSIS_MODE);

    it('maps every mode to a segment and back', () => {
        for (const mode of modes) {
            expect(segmentToMode(modeToSegment(mode))).toBe(mode);
        }
    });

    it('gives every mode its own segment', () => {
        const segments = modes.map(modeToSegment);

        expect(new Set(segments).size).toBe(modes.length);
    });

    it('uses variantExplorer as the segment of the variant mode', () => {
        expect(modeToSegment('variant')).toBe('variantExplorer');
        expect(segmentToMode('variantExplorer')).toBe('variant');
    });

    it('does not know the internal id of a mode whose segment differs', () => {
        expect(segmentToMode('variant')).toBeUndefined();
    });

    it('returns undefined for unknown or missing segments', () => {
        expect(segmentToMode('nope')).toBeUndefined();
        expect(segmentToMode(undefined)).toBeUndefined();
    });

    it('labels every mode', () => {
        for (const mode of modes) {
            expect(modeLabel(mode)).not.toBe('');
        }
    });
});
