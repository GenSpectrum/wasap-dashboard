import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { sequenceTypeSchema } from '../../../types/dashboardComponents';
import { enumParam, listParam, optional } from '../../urlParams';
import { excludeSetNameSchema, type WasapUntrackedFilter } from '../wasapAnalysisFilter';

export class UntrackedPageStateHandler extends WasapModePageStateHandler<WasapUntrackedFilter> {
    constructor(protected readonly config: WasapPageConfigFor<'untracked'>) {
        super(config, 'untracked');
    }

    protected readonly params = {
        sequenceType: enumParam(sequenceTypeSchema),
        excludeSet: optional(enumParam(excludeSetNameSchema)),
        excludeVariants: optional(listParam),
    };

    protected defaults(): WasapUntrackedFilter {
        const { sequenceType, excludeSet } = this.config.filterDefaults.untracked;
        return { mode: 'untracked', sequenceType, excludeSet, excludeVariants: undefined };
    }
}
