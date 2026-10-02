import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { getStringFromSearch } from '../../urlSearchParams';
import { type WasapDeconvolutionFilter } from '../wasapAnalysisFilter';

export class DeconvolutionPageStateHandler extends WasapModePageStateHandler<WasapDeconvolutionFilter> {
    protected readonly hasMeanProportion = false;

    constructor(protected readonly config: WasapPageConfigFor<'deconvolution'>) {
        super(config, 'deconvolution');
    }

    protected parseAnalysis(search: URLSearchParams): WasapDeconvolutionFilter {
        const panel = getStringFromSearch(search, 'panel');
        return {
            mode: 'deconvolution',
            panel:
                panel === undefined
                    ? this.config.filterDefaults.deconvolution.panel
                    : panel.split('|').filter((lineage) => lineage !== ''),
        };
    }

    protected setAnalysisSearchParams(search: URLSearchParams, analysis: WasapDeconvolutionFilter) {
        // Written even when empty, so that an emptied panel doesn't fall back to the default one.
        search.set('panel', analysis.panel.join('|'));
    }
}
