import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { parseCollectionId, setCollectionIdSearchParam } from './collectionIdParam';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { type WasapCollectionFilter } from '../wasapAnalysisFilter';

export class CollectionPageStateHandler extends WasapModePageStateHandler<WasapCollectionFilter> {
    constructor(protected readonly config: WasapPageConfigFor<'collection'>) {
        super(config, 'collection');
    }

    protected parseAnalysis(search: URLSearchParams): WasapCollectionFilter {
        return { mode: 'collection', collectionId: parseCollectionId(search) };
    }

    protected setAnalysisSearchParams(search: URLSearchParams, analysis: WasapCollectionFilter) {
        setCollectionIdSearchParam(search, analysis.collectionId);
    }
}
