import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { enumParam, numberParam, optional } from '../../urlParams';
import { COLLECTION_SOURCE, collectionSourceSchema, type WasapCollectionFilter } from '../wasapAnalysisFilter';

export class CollectionPageStateHandler extends WasapModePageStateHandler<WasapCollectionFilter> {
    constructor(protected readonly config: WasapPageConfigFor<'collection'>) {
        super(config, 'collection');
    }

    protected readonly params = {
        source: enumParam(collectionSourceSchema),
        collectionId: optional(numberParam({ min: 0, integer: true })),
    };

    protected defaults(): WasapCollectionFilter {
        return { mode: 'collection', source: COLLECTION_SOURCE.genSpectrum, collectionId: undefined };
    }

    protected parseAnalysis(search: URLSearchParams): WasapCollectionFilter {
        const analysis = super.parseAnalysis(search);
        // Only trust `covSpectrum` from the URL when this organism actually has that source
        // (e.g. an RSV link with a stale/crafted `source=covSpectrum` falls back to GenSpectrum).
        return this.config.covSpectrumCollectionSourceEnabled === true
            ? analysis
            : { ...analysis, source: COLLECTION_SOURCE.genSpectrum };
    }
}
