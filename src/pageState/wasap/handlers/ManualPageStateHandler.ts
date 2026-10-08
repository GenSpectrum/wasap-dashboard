import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { sequenceTypeSchema } from '../../../types/dashboardComponents';
import { enumParam, listParam, optional } from '../../urlParams';
import { type WasapManualFilter } from '../wasapAnalysisFilter';

export class ManualPageStateHandler extends WasapModePageStateHandler<WasapManualFilter> {
    constructor(protected readonly config: WasapPageConfigFor<'manual'>) {
        super(config, 'manual');
    }

    protected readonly params = {
        sequenceType: enumParam(sequenceTypeSchema),
        mutations: optional(listParam),
    };

    protected defaults(): WasapManualFilter {
        return { mode: 'manual', sequenceType: this.config.filterDefaults.manual.sequenceType, mutations: undefined };
    }
}
