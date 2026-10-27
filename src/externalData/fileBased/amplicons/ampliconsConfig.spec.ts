import { existsSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { ampliconsConfigSchema, KNOWN_PRIMER_SCHEMES, primerBedUrl } from './ampliconsConfig';

describe('ampliconsConfigSchema', () => {
    test('accepts a known scheme or a BED file', () => {
        expect(ampliconsConfigSchema.parse({ scheme: 'artic-sars-cov-2/400/v5.3.2' })).toEqual({
            scheme: 'artic-sars-cov-2/400/v5.3.2',
        });
        expect(ampliconsConfigSchema.parse({ bedFile: 'primers/own.bed' })).toEqual({ bedFile: 'primers/own.bed' });
    });

    test('rejects an unknown scheme', () => {
        expect(() => ampliconsConfigSchema.parse({ scheme: 'artic-sars-cov-2/400/v0' })).toThrow();
    });
});

describe('primerBedUrl', () => {
    test('puts a vendored scheme or a relative path below the base URL', () => {
        expect(primerBedUrl({ scheme: 'artic-sars-cov-2/400/v5.3.2' }, '/')).toBe(
            '/primers/covid/ARTIC_v5.3.2/primer.bed',
        );
        expect(primerBedUrl({ bedFile: 'own/primer.bed' }, '/wasap')).toBe('/wasap/own/primer.bed');
    });

    test('leaves absolute paths and URLs alone', () => {
        expect(primerBedUrl({ bedFile: '/own/primer.bed' }, '/wasap/')).toBe('/own/primer.bed');
        expect(primerBedUrl({ bedFile: 'https://example.org/primer.bed' }, '/')).toBe('https://example.org/primer.bed');
    });
});

test('every known scheme is vendored', () => {
    for (const path of Object.values(KNOWN_PRIMER_SCHEMES)) {
        expect(existsSync(`public/${path}`), path).toBe(true);
    }
});
