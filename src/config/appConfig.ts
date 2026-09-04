import { z } from 'zod';

/**
 * Runtime configuration for the standalone app.
 *
 * Replaces the dashboards repo's server-side `config.ts` (which read a YAML
 * file from disk per request) and its `DB_ID_SPACE` / `DASHBOARDS_ENVIRONMENT`
 * environment variables. Here the config is a single `config.json` fetched once
 * at startup (see `main.tsx`), falling back to the `prod` defaults below when
 * the file is absent — so the app works with no configuration at all.
 *
 * This is the seam that `09-third-party-hosting.md` grows into: a self-hoster
 * ships their own `config.json`.
 */

const appConfigSchema = z.object({
    /**
     * Which set of collection / variant database IDs the per-organism config
     * resolves to (`byEnv(...)` in `wastewaterConfig.ts`).
     */
    dbIdSpace: z.enum(['prod', 'staging', 'local']).default('prod'),
    /**
     * Base URL of the GenSpectrum collections backend (resistance-mutation
     * collections, predefined variants, `collection` mode). May be absolute or
     * a same-origin path. The backend sends no CORS headers, so in dev the
     * default is the Vite proxy path (`vite.config.ts`); a deployment must set
     * an absolute URL to a backend that allows its origin, or its own proxy.
     */
    collectionsBackendUrl: z
        .string()
        .min(1)
        .default(import.meta.env.DEV ? '/collections-backend' : 'https://genspectrum.org/api'),
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
