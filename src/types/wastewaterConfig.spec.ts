import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import {
    enabledAnalysisModes,
    wasapPageConfigSchema,
    type WasapPageConfig,
} from '../components/views/wasap/wasapPageConfig';

// These pin behaviour of the GenSpectrum-hosted deployment's own data, which
// now lives in `public/config.example.json` rather than in TypeScript.
const prodOrganisms = (
    JSON.parse(readFileSync('public/config.example.json', 'utf-8')) as { organisms: unknown[] }
).organisms.map((organism) => wasapPageConfigSchema.parse(organism));

describe.each(prodOrganisms.map((config) => [config.internalName, config] as const))(
    'config.example.json %s',
    (_internalName, config: WasapPageConfig) => {
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
    },
);

test('COVID wastewater opens on Spike resistance mutations by default', () => {
    const covidConfig = prodOrganisms.find((config) => config.internalName === 'covid');
    if (covidConfig === undefined) {
        throw new Error('No covid config found in config.example.json.');
    }

    // This pins the default requested for the COVID wastewater dashboard landing state.
    expect(covidConfig.defaultAnalysisMode).toBe('resistance');
    if (!covidConfig.resistanceAnalysisModeEnabled) {
        throw new Error('COVID wastewater resistance analysis mode must be enabled.');
    }
    expect(covidConfig.filterDefaults.resistance.resistanceSet).toBe('Spike');
});
