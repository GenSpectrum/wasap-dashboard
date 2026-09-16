import { z } from 'zod';

import { wasapPageConfigSchema } from './wasapPageConfig';

/**
 * Runtime configuration for the standalone app.
 *
 * A single `config.json` fetched once at startup (see `main.tsx`).
 * `organisms` *is* the per-organism config — not a selector into hardcoded
 * data — and unlike `collectionsBackendUrl` it has **no built-in default**: a
 * deployment with no `config.json` (or one that omits `organisms`) genuinely
 * serves zero wastewater dashboards (`WasapRoute` says so), rather than
 * silently falling back to GenSpectrum's own data. `public/config.example.json`
 * (+ the staging / local-dev example configs) are that data now, checked in
 * as *examples* to copy from, not defaults this module reaches for.
 *
 * This is the seam that `09-third-party-hosting.md` grows into: a self-hoster
 * ships their own `config.json`.
 */

const appConfigSchema = z.object({
    /**
     * Base URL of the GenSpectrum collections backend (resistance-mutation
     * collections, predefined variants, `collection` mode). May be absolute or
     * a same-origin path.
     */
    collectionsBackendUrl: z.string().min(1).default('https://genspectrum.org/api'),
    /**
     * Every wastewater dashboard this deployment serves, keyed by nothing —
     * order is display order. `config/wastewaterOrganisms.ts` maps URL path
     * segments (`covid`, `rsv-a`, …) onto entries of this array. No default:
     * an absent or organisms-less config.json means zero dashboards.
     */
    organisms: z.array(wasapPageConfigSchema).default([]),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const defaultAppConfig: AppConfig = appConfigSchema.parse({});

let currentConfig: AppConfig = defaultAppConfig;

/**
 * Fetch and apply `config.json`. Called once, before the app renders. A missing
 * file is fine (defaults are used); a present-but-invalid file is a hard error,
 * because a misconfigured deployment should fail loudly rather than silently
 * talk to the wrong backend.
 */
export async function loadAppConfig(): Promise<AppConfig> {
    const url = `${import.meta.env.BASE_URL}config.json`;

    let response: Response;
    try {
        response = await fetch(url);
    } catch {
        currentConfig = defaultAppConfig;
        return currentConfig;
    }

    if (!response.ok) {
        currentConfig = defaultAppConfig;
        return currentConfig;
    }

    // No config.json — a static host (or the Vite dev server) answered the
    // missing file with a 200 OK SPA fallback to index.html rather than a 404.
    // Detect that by content type, not by whether the body happens to fail to
    // parse as JSON: a present config.json with a JSON syntax error must still
    // fail loudly below, not be mistaken for "absent".
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('text/html')) {
        currentConfig = defaultAppConfig;
        return currentConfig;
    }

    const body = await response.text();

    // A present-but-invalid config is a hard error: a misconfigured deployment
    // should fail loudly rather than silently talk to the wrong backend.
    const parsed: unknown = JSON.parse(body);
    currentConfig = appConfigSchema.parse(parsed);
    return currentConfig;
}

export function getAppConfig(): AppConfig {
    return currentConfig;
}

/** Test seam: set the config synchronously without fetching. */
export function setAppConfigForTesting(config: Partial<AppConfig>): void {
    currentConfig = appConfigSchema.parse({ ...currentConfig, ...config });
}
