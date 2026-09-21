import { describe, expect, it } from 'vitest';

import { getDefaultAnalysisMode, isModeEnabled, type WasapPageConfig } from './wasapPageConfig';
import { testConfig, testConfigWithCollection } from '../pageState/wasap/wasapTestConfig';

describe('getDefaultAnalysisMode', () => {
    it('is the first enabled mode when none is configured', () => {
        expect(getDefaultAnalysisMode(testConfig)).toBe('manual');
    });

    it('is the configured default mode', () => {
        expect(getDefaultAnalysisMode({ ...testConfig, defaultAnalysisMode: 'resistance' })).toBe('resistance');
    });

    it('ignores a configured default mode that is not enabled', () => {
        expect(getDefaultAnalysisMode({ ...testConfig, defaultAnalysisMode: 'covSpectrumCollection' })).toBe('manual');
    });

    it('is undefined when no mode is enabled', () => {
        const noModes = {
            ...testConfig,
            manualAnalysisModeEnabled: undefined,
            variantAnalysisModeEnabled: undefined,
            resistanceAnalysisModeEnabled: undefined,
            untrackedAnalysisModeEnabled: undefined,
        } as WasapPageConfig;

        expect(getDefaultAnalysisMode(noModes)).toBeUndefined();
    });
});

describe('isModeEnabled', () => {
    it('tells which modes are enabled', () => {
        expect(isModeEnabled(testConfig, 'manual')).toBe(true);
        expect(isModeEnabled(testConfig, 'covSpectrumCollection')).toBe(false);
        expect(isModeEnabled(testConfigWithCollection, 'covSpectrumCollection')).toBe(true);
    });
});
