import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { getStringFromSearch, setSearchFromString } from '../../urlSearchParams';
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

    protected parseAnalysis(search: URLSearchParams): WasapResistanceFilter {
        return {
            mode: 'resistance',
            sequenceType: 'amino acid',
            resistanceSet:
                getStringFromSearch(search, 'resistanceSet') ?? this.config.filterDefaults.resistance.resistanceSet,
            proportionRange:
                resistanceProportionRangeSchema.safeParse(getStringFromSearch(search, 'proportionRange')).data ??
                RESISTANCE_PROPORTION_RANGE.medium,
        };
    }

    protected setAnalysisSearchParams(search: URLSearchParams, analysis: WasapResistanceFilter) {
        setSearchFromString(search, 'resistanceSet', analysis.resistanceSet);
        setSearchFromString(search, 'proportionRange', analysis.proportionRange);
    }
}
