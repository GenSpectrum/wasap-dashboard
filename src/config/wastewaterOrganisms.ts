import { getAppConfig } from './appConfig';
import type { WasapPageConfig } from './wasapPageConfig';

/**
 * The organism-selection layer for the standalone app.
 *
 * Astro routed each organism as its own `.astro` page. Here a single
 * `/:organismPath` route serves all three, and this module maps the URL
 * segment (`covid` / `rsv-a` / `rsv-b`) to the per-organism `WasapPageConfig`.
 * The route path deliberately matches `config.path` so the links the wasap
 * code builds from it stay valid.
 *
 * The organism list itself is `getAppConfig().organisms` — a deployment's
 * `config.json` — not a hardcoded set, so this module no longer assumes there
 * are exactly three, or that they're called `covid` / `rsvA` / `rsvB`. See
 * 08-open-questions-to-resolve.md §8.2 ("known organism" registry) for where
 * this was headed anyway.
 */

export type WastewaterOrganismEntry = {
    config: WasapPageConfig;
    /** Last segment of `config.path`, used as the `:organismPath` route param. */
    pathSegment: string;
};

export function listWastewaterOrganisms(): WastewaterOrganismEntry[] {
    return getAppConfig().organisms.map((config) => ({
        config,
        pathSegment: config.path.split('/').pop() ?? config.internalName,
    }));
}

export function resolveWasapConfig(pathSegment: string | undefined): WasapPageConfig | undefined {
    if (pathSegment === undefined) {
        return undefined;
    }
    return listWastewaterOrganisms().find((entry) => entry.pathSegment === pathSegment)?.config;
}
