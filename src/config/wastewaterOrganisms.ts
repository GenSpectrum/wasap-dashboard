import type { WasapPageConfig } from '../components/views/wasap/wasapPageConfig';
import { wastewaterOrganismConfigs, wastewaterOrganisms, type WastewaterOrganismName } from '../types/wastewaterConfig';

/**
 * The organism-selection layer for the standalone app.
 *
 * Astro routed each organism as its own `.astro` page. Here a single
 * `/swiss-wastewater/:organismPath` route serves all three, and this module
 * maps the URL segment (`covid` / `rsv-a` / `rsv-b`) to the per-organism
 * `WasapPageConfig`. The route path deliberately matches `config.path` so the
 * links the wasap code builds from it stay valid.
 *
 * Longer term this becomes a "known organism" registry (see
 * 08-open-questions-to-resolve.md §8.2); for now it is the three hardcoded
 * GenSpectrum datasets.
 */

export type WastewaterOrganismEntry = {
    name: WastewaterOrganismName;
    config: WasapPageConfig;
    /** Last segment of `config.path`, used as the `:organismPath` route param. */
    pathSegment: string;
};

export const DEFAULT_ORGANISM_PATH = 'covid';

export function listWastewaterOrganisms(): WastewaterOrganismEntry[] {
    const configs = wastewaterOrganismConfigs();
    return (Object.keys(wastewaterOrganisms) as WastewaterOrganismName[]).map((name) => {
        const config = configs[name];
        return { name, config, pathSegment: config.path.split('/').pop() ?? name };
    });
}

export function resolveWasapConfig(pathSegment: string | undefined): WasapPageConfig | undefined {
    if (pathSegment === undefined) {
        return undefined;
    }
    return listWastewaterOrganisms().find((entry) => entry.pathSegment === pathSegment)?.config;
}
