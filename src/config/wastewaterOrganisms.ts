import type { WasapPageConfig } from '../components/views/wasap/wasapPageConfig';
import { getAppConfig } from './appConfig';

/**
 * The organism-selection layer for the standalone app.
 *
 * Astro routed each organism as its own `.astro` page. Here a single
 * `/swiss-wastewater/:organismPath` route serves all three, and this module
 * maps the URL segment (`covid` / `rsv-a` / `rsv-b`) to the per-organism
 * `WasapPageConfig`. The route path deliberately matches `config.path` so the
 * links the wasap code builds from it stay valid.
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

/**
 * The organism the root path and an unresolvable `:organismPath` redirect to.
 * A `config.json` that doesn't configure this organism (or configures none at
 * all) is handled by `WasapRoute`'s empty state, not by falling back further.
 */
export const DEFAULT_ORGANISM_PATH = 'covid';

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

/**
 * What `WasapRoute` should do for a `:organismPath` that didn't resolve —
 * pulled out of the component so the "don't redirect to where we already are"
 * loop guard is unit-testable without rendering anything. `organisms` is
 * `listWastewaterOrganisms()`'s result; `requestedPathSegment` is the URL
 * param that failed to resolve.
 */
export type UnresolvedOrganismOutcome =
    | { type: 'empty' }
    | {
          type: 'redirect';
          pathSegment: string;
      };

export function resolveUnresolvedOrganism(
    organisms: readonly WastewaterOrganismEntry[],
    requestedPathSegment: string | undefined,
): UnresolvedOrganismOutcome {
    if (organisms.length === 0) {
        return { type: 'empty' };
    }
    const fallbackSegment = organisms.some((entry) => entry.pathSegment === DEFAULT_ORGANISM_PATH)
        ? DEFAULT_ORGANISM_PATH
        : organisms[0]!.pathSegment;
    if (requestedPathSegment === fallbackSegment) {
        // Already at the computed fallback and it *still* doesn't resolve —
        // config.json is internally inconsistent (duplicate / mismatched path
        // segments). Report "empty" rather than have the caller loop the redirect.
        return { type: 'empty' };
    }
    return { type: 'redirect', pathSegment: fallbackSegment };
}
