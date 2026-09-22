import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { wasapPageConfigSchema, type WasapPageConfig } from './wasapPageConfig';

// These pin behaviour of the GenSpectrum-hosted deployment's own data, which
// now lives in `public/config.example.json` rather than in TypeScript.
const prodOrganisms = (
    JSON.parse(readFileSync('public/config.example.json', 'utf-8')) as { organisms: unknown[] }
).organisms.map((organism) => wasapPageConfigSchema.parse(organism));

describe.each(prodOrganisms.map((config) => [config.genSpectrumOrganismName, config] as const))(
    'config.example.json %s',
    (_genSpectrumOrganismName, config: WasapPageConfig) => {
        test('default resistance set name is valid', () => {
            if (config.resistanceAnalysisModeEnabled) {
                const resistanceSetNames = config.resistanceMutationCollections.map((s) => s.name);
                const defaultSetName = config.filterDefaults.resistance.resistanceSet;
                expect(resistanceSetNames).include(defaultSetName);
            }
        });
    },
);

test('COVID wastewater defaults resistance mutation mode to Spike', () => {
    const covidConfig = prodOrganisms.find((config) => config.genSpectrumOrganismName === 'covid');
    if (covidConfig === undefined) {
        throw new Error('No covid config found in config.example.json.');
    }

    // This pins the default resistance set requested for the COVID wastewater dashboard.
    if (!covidConfig.resistanceAnalysisModeEnabled) {
        throw new Error('COVID wastewater resistance analysis mode must be enabled.');
    }
    expect(covidConfig.filterDefaults.resistance.resistanceSet).toBe('Spike');
});
