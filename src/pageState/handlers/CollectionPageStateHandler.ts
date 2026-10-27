import { ModePageStateHandler } from './ModePageStateHandler';
import { type OrganismConfigFor } from '../../config/organismConfig';
import { COLLECTION_SOURCE, collectionSourceSchema, type CollectionAnalysis } from '../analysisFilter';
import { enumParam, numberParam, optional } from '../urlParams';

export class CollectionPageStateHandler extends ModePageStateHandler<CollectionAnalysis> {
    constructor(protected readonly config: OrganismConfigFor<'collection'>) {
        super(config, 'collection');
    }

    protected readonly params = {
        source: enumParam(collectionSourceSchema),
        collectionId: optional(numberParam({ min: 0, integer: true })),
    };

    protected defaults(): CollectionAnalysis {
        return { mode: 'collection', source: COLLECTION_SOURCE.genSpectrum, collectionId: undefined };
    }

    protected parseAnalysis(search: URLSearchParams): CollectionAnalysis {
        const analysis = super.parseAnalysis(search);
        // Only trust `covSpectrum` from the URL when this organism actually has that source
        // (e.g. an RSV link with a stale/crafted `source=covSpectrum` falls back to GenSpectrum).
        return this.config.covSpectrumCollectionSourceEnabled === true
            ? analysis
            : { ...analysis, source: COLLECTION_SOURCE.genSpectrum };
    }
}
