import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { sequenceTypeSchema } from '../../../types/dashboardComponents';
import { enumParam, listParam, numberParam, optional, stringParam } from '../../urlParams';
import { MAX_POSITION_RANGE_LENGTH, mutationSourceSchema, type WasapManualFilter } from '../wasapAnalysisFilter';

export class ManualPageStateHandler extends WasapModePageStateHandler<WasapManualFilter> {
    constructor(protected readonly config: WasapPageConfigFor<'manual'>) {
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

    protected defaults(): WasapManualFilter {
        return { mode: 'manual', sequenceType: this.config.filterDefaults.manual.sequenceType, mutations: undefined };
    }
}
