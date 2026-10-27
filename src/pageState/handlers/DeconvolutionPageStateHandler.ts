import { ModePageStateHandler } from './ModePageStateHandler';
import { type OrganismConfigFor } from '../../config/organismConfig';
import { type DeconvolutionAnalysis } from '../analysisFilter';
import { optional, stringParam } from '../urlParams';

export class DeconvolutionPageStateHandler extends ModePageStateHandler<DeconvolutionAnalysis> {
    protected readonly hasMeanProportion = false;

    constructor(protected readonly config: OrganismConfigFor<'deconvolution'>) {
        super(config, 'deconvolution');
    }

    protected readonly params = {
        extraLineage: optional(stringParam),
    };

    protected defaults(): DeconvolutionAnalysis {
        return { mode: 'deconvolution' };
    }
}
