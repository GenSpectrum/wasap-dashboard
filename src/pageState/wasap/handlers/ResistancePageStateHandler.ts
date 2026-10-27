import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { type OrganismConfigFor } from '../../../config/organismConfig';
import { enumParam, stringParam } from '../../urlParams';
import {
    RESISTANCE_PROPORTION_RANGE,
    resistanceProportionRangeSchema,
    type WasapResistanceFilter,
} from '../wasapAnalysisFilter';

export class ResistancePageStateHandler extends WasapModePageStateHandler<WasapResistanceFilter> {
    constructor(protected readonly config: OrganismConfigFor<'resistance'>) {
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
