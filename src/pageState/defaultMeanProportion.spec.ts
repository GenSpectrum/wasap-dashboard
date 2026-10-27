import { describe, expect, test } from 'vitest';

import type { AnalysisFilter } from './analysisFilter';
import { getDefaultMeanProportion } from './defaultMeanProportion';

describe('getDefaultMeanProportion', () => {
    test('manual mode without mutations keeps the previous 5 to 95 percent default', () => {
        const analysis: AnalysisFilter = {
            mode: 'manual',
            sequenceType: 'nucleotide',
            mutations: undefined,
        };

        expect(getDefaultMeanProportion(analysis)).toEqual({ lower: 0.05, upper: 0.95 });
    });

    test('manual mode with an emptied mutation list is the same as without mutations', () => {
        const analysis: AnalysisFilter = { mode: 'manual', sequenceType: 'nucleotide', mutations: [] };

        expect(getDefaultMeanProportion(analysis)).toEqual({ lower: 0.05, upper: 0.95 });
    });

    test('manual mode with a position range shows the whole mean proportion range', () => {
        const analysis: AnalysisFilter = { mode: 'manual', sequenceType: 'nucleotide', mutationSource: 'range' };

        expect(getDefaultMeanProportion(analysis)).toEqual({ lower: 0.0, upper: 1.0 });
    });

    test('other analysis states default to the full mean proportion range', () => {
        const analysis: AnalysisFilter = {
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
