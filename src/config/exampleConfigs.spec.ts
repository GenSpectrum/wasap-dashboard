import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { wasapPageConfigSchema } from '../components/views/wasap/wasapPageConfig';

/**
 * The checked-in example configs (`public/config*.example.json`) are the only
 * thing standing in for the old hardcoded `defaultOrganisms` now — nothing
 * else proves they're still valid `WasapPageConfig` data, so this does.
 *
 * Globbed rather than named one by one, so a new example config (a new
 * deployment target, a new demo variant, …) is covered automatically.
 */
const exampleConfigFilenames = readdirSync('public').filter(
    (name) => name.startsWith('config') && name.endsWith('.example.json'),
);

describe.each(exampleConfigFilenames)('%s', (filename) => {
    const parsed = JSON.parse(readFileSync(`public/${filename}`, 'utf-8')) as {
        collectionsBackendUrl?: string;
        organisms?: unknown[];
    };

    test('has a collectionsBackendUrl and a non-empty organisms array', () => {
        expect(typeof parsed.collectionsBackendUrl).toBe('string');
        expect(parsed.organisms).toBeInstanceOf(Array);
        expect(parsed.organisms!.length).toBeGreaterThan(0);
    });

    test('every organism validates against wasapPageConfigSchema', () => {
        for (const organism of parsed.organisms!) {
            expect(() => wasapPageConfigSchema.parse(organism)).not.toThrow();
        }
    });
});
