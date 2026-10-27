import { ModePageStateHandler } from './ModePageStateHandler';
import { type OrganismConfigFor } from '../../../config/organismConfig';
import { sequenceTypeSchema } from '../../../util/mutations';
import { enumParam, listParam, optional } from '../../urlParams';
import { excludeSetNameSchema, type UntrackedAnalysis } from '../analysisFilter';

export class UntrackedPageStateHandler extends ModePageStateHandler<UntrackedAnalysis> {
    constructor(protected readonly config: OrganismConfigFor<'untracked'>) {
        super(config, 'untracked');
    }

    protected readonly params = {
        sequenceType: enumParam(sequenceTypeSchema),
        excludeSet: optional(enumParam(excludeSetNameSchema)),
        excludeVariants: optional(listParam),
    };

    protected defaults(): UntrackedAnalysis {
        const { sequenceType, excludeSet } = this.config.filterDefaults.untracked;
        return { mode: 'untracked', sequenceType, excludeSet, excludeVariants: undefined };
    }
}
