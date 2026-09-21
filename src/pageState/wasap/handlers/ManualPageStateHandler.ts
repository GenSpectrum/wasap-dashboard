import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { type SequenceType } from '../../../types/dashboardComponents';
import { getStringFromSearch, setSearchFromString } from '../../urlSearchParams';
import { type WasapManualFilter } from '../wasapAnalysisFilter';

export class ManualPageStateHandler extends WasapModePageStateHandler<WasapManualFilter> {
    constructor(protected readonly config: WasapPageConfigFor<'manual'>) {
        super(config, 'manual');
    }

    protected parseAnalysis(search: URLSearchParams): WasapManualFilter {
        return {
            mode: 'manual',
            sequenceType:
                (getStringFromSearch(search, 'sequenceType') as SequenceType | undefined) ??
                this.config.filterDefaults.manual.sequenceType,
            mutations: getStringFromSearch(search, 'mutations')?.split('|'),
        };
    }

    protected setAnalysisSearchParams(search: URLSearchParams, analysis: WasapManualFilter) {
        setSearchFromString(search, 'sequenceType', analysis.sequenceType);
        setSearchFromString(search, 'mutations', analysis.mutations?.join('|'));
    }
}
