import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { enumParam, stringParam } from '../../urlParams';
import {
    RESISTANCE_PROPORTION_RANGE,
    resistanceProportionRangeSchema,
    type WasapResistanceFilter,
} from '../wasapAnalysisFilter';

export class ResistancePageStateHandler extends WasapModePageStateHandler<WasapResistanceFilter> {
    constructor(protected readonly config: WasapPageConfigFor<'resistance'>) {
        super(config, 'resistance');
    }

    // The page has tabs for ranges of the mean proportion instead (`proportionRange`).
    protected readonly hasMeanProportion = false;

    protected readonly params = {
        resistanceSet: stringParam,
        proportionRange: enumParam(resistanceProportionRangeSchema),
    };

    protected defaults(): WasapResistanceFilter {
        return {
            mode: 'resistance',
            sequenceType: 'amino acid',
            resistanceSet: this.config.filterDefaults.resistance.resistanceSet,
            proportionRange: RESISTANCE_PROPORTION_RANGE.medium,
        };
    }
}
