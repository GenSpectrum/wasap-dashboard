import { describe, expect, it } from 'vitest';

import { CollectionPageStateHandler } from './CollectionPageStateHandler';
import { testConfigWithCollection, testConfigWithCollectionSources } from '../wasapTestConfig';

describe('CollectionPageStateHandler', () => {
    const handler = new CollectionPageStateHandler(testConfigWithCollection);

    const parse = (query: string) => handler.parsePageStateFromUrl(new URLSearchParams(query));

    it('lives at the collection segment below the path of the organism', () => {
        expect(handler.getDefaultPageUrl()).toBe('/wastewater/covid/collection');
    });

    it('parses the collectionId as a number', () => {
        const filter = parse('collectionId=456');

        expect(filter.analysis).toEqual({ mode: 'collection', source: 'genSpectrum', collectionId: 456 });
    });

    it('has no collection when there is no collectionId', () => {
        const filter = parse('');

        expect(filter.analysis.collectionId).toBeUndefined();
        expect(handler.toUrl(filter)).not.toContain('collectionId');
    });

    it('round-trips the collectionId', () => {
        expect(handler.toUrl(parse('collectionId=789'))).toContain('collectionId=789');
    });

    describe('source', () => {
        it('defaults to GenSpectrum, and omits it from the URL', () => {
            const filter = parse('');

            expect(filter.analysis.source).toBe('genSpectrum');
            expect(handler.toUrl(filter)).not.toContain('source');
        });

        it('falls back to GenSpectrum when the CoV-Spectrum source is not enabled here, even if the URL asks for it', () => {
            expect(parse('source=covSpectrum').analysis.source).toBe('genSpectrum');
        });

        describe('with the CoV-Spectrum source enabled', () => {
            const handlerWithSources = new CollectionPageStateHandler(testConfigWithCollectionSources);
            const parseWithSources = (query: string) =>
                handlerWithSources.parsePageStateFromUrl(new URLSearchParams(query));

            it('parses the CoV-Spectrum source from the URL', () => {
                expect(parseWithSources('source=covSpectrum').analysis.source).toBe('covSpectrum');
            });

            it('round-trips the CoV-Spectrum source together with its collectionId', () => {
                const url = handlerWithSources.toUrl(parseWithSources('source=covSpectrum&collectionId=42'));

                expect(url).toContain('source=covSpectrum');
                expect(url).toContain('collectionId=42');
            });

            it('omits the source from the URL when it is GenSpectrum, the default', () => {
                expect(handlerWithSources.toUrl(parseWithSources('collectionId=1'))).not.toContain('source');
            });
        });
    });
});
