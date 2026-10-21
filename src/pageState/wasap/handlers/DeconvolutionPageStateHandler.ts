import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { optional, stringParam } from '../../urlParams';
import { type WasapDeconvolutionFilter } from '../wasapAnalysisFilter';

export class DeconvolutionPageStateHandler extends WasapModePageStateHandler<WasapDeconvolutionFilter> {
    protected readonly hasMeanProportion = false;

    constructor(protected readonly config: WasapPageConfigFor<'deconvolution'>) {
        super(config, 'deconvolution');
    }

    protected readonly params = {
        // The panel isn't in the URL: it is always the one of the config.
        extraLineage: optional(stringParam),
    };

    protected defaults(): WasapDeconvolutionFilter {
        return { mode: 'deconvolution', panel: this.config.filterDefaults.deconvolution.panel };
    }
}
