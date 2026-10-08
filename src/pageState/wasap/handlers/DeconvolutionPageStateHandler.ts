import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { listParam } from '../../urlParams';
import { type WasapDeconvolutionFilter } from '../wasapAnalysisFilter';

export class DeconvolutionPageStateHandler extends WasapModePageStateHandler<WasapDeconvolutionFilter> {
    protected readonly hasMeanProportion = false;

    constructor(protected readonly config: WasapPageConfigFor<'deconvolution'>) {
        super(config, 'deconvolution');
    }

    protected readonly params = {
        // An emptied panel is written as `panel=`, so that it doesn't fall back to the default one.
        panel: listParam,
    };

    protected defaults(): WasapDeconvolutionFilter {
        return { mode: 'deconvolution', panel: this.config.filterDefaults.deconvolution.panel };
    }
}
