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
        extraLineage: optional(stringParam),
    };

    protected defaults(): WasapDeconvolutionFilter {
        return { mode: 'deconvolution' };
    }
}
