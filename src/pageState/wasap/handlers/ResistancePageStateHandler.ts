import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { getStringFromSearch, setSearchFromString } from '../../urlSearchParams';
import { type WasapResistanceFilter } from '../wasapAnalysisFilter';

export class ResistancePageStateHandler extends WasapModePageStateHandler<WasapResistanceFilter> {
    constructor(protected readonly config: WasapPageConfigFor<'resistance'>) {
        super(config, 'resistance');
    }

    protected parseAnalysis(search: URLSearchParams): WasapResistanceFilter {
        return {
            mode: 'resistance',
            sequenceType: 'amino acid',
            resistanceSet:
                getStringFromSearch(search, 'resistanceSet') ?? this.config.filterDefaults.resistance.resistanceSet,
        };
    }

    protected setAnalysisSearchParams(search: URLSearchParams, analysis: WasapResistanceFilter) {
        setSearchFromString(search, 'resistanceSet', analysis.resistanceSet);
    }
}
