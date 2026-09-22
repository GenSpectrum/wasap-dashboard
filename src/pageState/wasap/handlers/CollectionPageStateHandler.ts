import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { parseCollectionId, setCollectionIdSearchParam } from './collectionIdParam';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { getStringFromSearch, setSearchFromString } from '../../urlSearchParams';
import { COLLECTION_SOURCE, type WasapCollectionFilter } from '../wasapAnalysisFilter';

export class CollectionPageStateHandler extends WasapModePageStateHandler<WasapCollectionFilter> {
    constructor(protected readonly config: WasapPageConfigFor<'collection'>) {
        super(config, 'collection');
    }

    protected parseAnalysis(search: URLSearchParams): WasapCollectionFilter {
        const requestedSource = getStringFromSearch(search, 'source');
        // Only trust `covSpectrum` from the URL when this organism actually has that source
        // (e.g. an RSV link with a stale/crafted `source=covSpectrum` falls back to GenSpectrum).
        const source =
            requestedSource === COLLECTION_SOURCE.covSpectrum && this.config.covSpectrumCollectionSourceEnabled
                ? COLLECTION_SOURCE.covSpectrum
                : COLLECTION_SOURCE.genSpectrum;
        return { mode: 'collection', source, collectionId: parseCollectionId(search) };
    }

    protected setAnalysisSearchParams(search: URLSearchParams, analysis: WasapCollectionFilter) {
        // GenSpectrum is the default, so it is only written to the URL when it differs.
        if (analysis.source !== COLLECTION_SOURCE.genSpectrum) {
            setSearchFromString(search, 'source', analysis.source);
        }
        setCollectionIdSearchParam(search, analysis.collectionId);
    }
}
