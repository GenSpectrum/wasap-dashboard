import { describe, expect, it } from 'vitest';

import { CollectionPageStateHandler } from './CollectionPageStateHandler';
import { testConfigWithGenSpectrumCollection } from '../wasapTestConfig';

describe('CollectionPageStateHandler', () => {
    const handler = new CollectionPageStateHandler(testConfigWithGenSpectrumCollection);

    const parse = (query: string) => handler.parsePageStateFromUrl(new URLSearchParams(query));

    it('lives at the collection segment below the path of the organism', () => {
        expect(handler.getDefaultPageUrl()).toBe('/wastewater/covid/collection');
    });

    it('parses the collectionId as a number', () => {
        const filter = parse('collectionId=456');

        expect(filter.analysis).toEqual({ mode: 'collection', collectionId: 456 });
    });

    it('has no collection when there is no collectionId', () => {
        const filter = parse('');

        expect(filter.analysis.collectionId).toBeUndefined();
        expect(handler.toUrl(filter)).not.toContain('collectionId');
    });

    it('round-trips the collectionId', () => {
        expect(handler.toUrl(parse('collectionId=789'))).toContain('collectionId=789');
    });
});
