import { describe, expect, test } from 'vitest';

import { wastewaterOrganismConfigs, wastewaterOrganisms } from './wastewaterConfig';
import { enabledAnalysisModes, wasapPageConfigSchema } from '../components/views/wasap/wasapPageConfig';

describe.each(Object.entries(wastewaterOrganismConfigs()))('wastewaterConfig %s', (_configName, config) => {
    // Proves the zod schema actually accepts the real per-organism data — the
    // point of turning `WasapPageConfig` into a schema is to validate a
    // deployment's `config.json`, so a schema that silently rejects (or, worse,
    // silently strips) real config data would defeat the purpose.
    test('validates against wasapPageConfigSchema, round-tripping unchanged', () => {
        expect(wasapPageConfigSchema.parse(config)).toEqual(config);
    });

    test('default resistance set name is valid', () => {
        if (config.resistanceAnalysisModeEnabled) {
            const resistanceSetNames = config.resistanceMutationCollections.map((s) => s.name);
            const defaultSetName = config.filterDefaults.resistance.resistanceSet;
            expect(resistanceSetNames).include(defaultSetName);
        }
    });

    test('configured default mode must be enabled', () => {
        const defaultMode = config.defaultAnalysisMode;
        if (defaultMode === undefined) {
            return;
        }

        // Prevent configs from pointing the URL-less page state at a disabled mode.
        expect(enabledAnalysisModes(config)).include(defaultMode);
    });
});

test('COVID wastewater opens on Spike resistance mutations by default', () => {
    const covidConfig = wastewaterOrganismConfigs()[wastewaterOrganisms.covid];

    // This pins the default requested for the COVID wastewater dashboard landing state.
    expect(covidConfig.defaultAnalysisMode).toBe('resistance');
    if (!covidConfig.resistanceAnalysisModeEnabled) {
        throw new Error('COVID wastewater resistance analysis mode must be enabled.');
    }
    expect(covidConfig.filterDefaults.resistance.resistanceSet).toBe('Spike');
});
