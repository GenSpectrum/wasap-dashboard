import { describe, expect, test } from 'vitest';

import { getDefaultMeanProportion } from './defaultMeanProportion';
import type { WasapAnalysisFilter } from './wasapAnalysisFilter';

describe('getDefaultMeanProportion', () => {
    test('manual mode without mutations keeps the previous 5 to 95 percent default', () => {
        const analysis: WasapAnalysisFilter = {
            mode: 'manual',
            sequenceType: 'nucleotide',
            mutations: undefined,
        };

        expect(getDefaultMeanProportion(analysis)).toEqual({ lower: 0.05, upper: 0.95 });
    });

    test('other analysis states default to the full mean proportion range', () => {
        const analysis: WasapAnalysisFilter = {
            mode: 'variant',
            signatureType: 'computed',
            sequenceType: 'nucleotide',
            variant: 'XFG*',
            minProportion: 0.8,
            minCount: 15,
            minJaccard: 0.75,
            timeFrame: 'all',
        };

        expect(getDefaultMeanProportion(analysis)).toEqual({ lower: 0.0, upper: 1.0 });
    });
});
