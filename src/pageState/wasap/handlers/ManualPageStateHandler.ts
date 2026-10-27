import { ModePageStateHandler } from './ModePageStateHandler';
import { type OrganismConfigFor } from '../../../config/organismConfig';
import { sequenceTypeSchema } from '../../../util/mutations';
import { enumParam, listParam, numberParam, optional, stringParam } from '../../urlParams';
import { MAX_POSITION_RANGE_LENGTH, mutationSourceSchema, type ManualAnalysis } from '../analysisFilter';

export class ManualPageStateHandler extends ModePageStateHandler<ManualAnalysis> {
    constructor(protected readonly config: OrganismConfigFor<'manual'>) {
        super(config, 'manual');
    }

    protected readonly params = {
        sequenceType: enumParam(sequenceTypeSchema),
        mutationSource: optional(enumParam(mutationSourceSchema)),
        mutations: optional(listParam),
        rangeGene: optional(stringParam),
        rangeStart: optional(numberParam({ min: 1, integer: true })),
        rangeLength: optional(numberParam({ min: 1, max: MAX_POSITION_RANGE_LENGTH, integer: true })),
    };

    protected defaults(): ManualAnalysis {
        return { mode: 'manual', sequenceType: this.config.filterDefaults.manual.sequenceType, mutations: undefined };
    }
}
