import { describe, expect, it } from 'vitest';

import { isModeEnabled } from './wasapPageConfig';
import { testConfig, testConfigWithCollection } from '../pageState/wasap/wasapTestConfig';

describe('isModeEnabled', () => {
    it('tells which modes are enabled', () => {
        expect(isModeEnabled(testConfig, 'manual')).toBe(true);
        expect(isModeEnabled(testConfig, 'collection')).toBe(false);
        expect(isModeEnabled(testConfigWithCollection, 'collection')).toBe(true);
    });
});
