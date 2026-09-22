import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { parseCollectionId, setCollectionIdSearchParam } from './collectionIdParam';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { type WasapCovSpectrumCollectionFilter } from '../wasapAnalysisFilter';

export class CovSpectrumCollectionPageStateHandler extends WasapModePageStateHandler<WasapCovSpectrumCollectionFilter> {
    constructor(protected readonly config: WasapPageConfigFor<'covSpectrumCollection'>) {
        super(config, 'covSpectrumCollection');
    }

    protected parseAnalysis(search: URLSearchParams): WasapCovSpectrumCollectionFilter {
        return { mode: 'covSpectrumCollection', collectionId: parseCollectionId(search) };
    }

    protected setAnalysisSearchParams(search: URLSearchParams, analysis: WasapCovSpectrumCollectionFilter) {
        setCollectionIdSearchParam(search, analysis.collectionId);
    }
}
