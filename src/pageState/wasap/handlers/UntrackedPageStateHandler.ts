import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { type SequenceType } from '../../../types/dashboardComponents';
import { getStringFromSearch, setSearchFromString } from '../../urlSearchParams';
import { type ExcludeSetName, type WasapUntrackedFilter } from '../wasapAnalysisFilter';

export class UntrackedPageStateHandler extends WasapModePageStateHandler<WasapUntrackedFilter> {
    constructor(protected readonly config: WasapPageConfigFor<'untracked'>) {
        super(config, 'untracked');
    }

    protected parseAnalysis(search: URLSearchParams): WasapUntrackedFilter {
        const defaults = this.config.filterDefaults.untracked;

        return {
            mode: 'untracked',
            sequenceType:
                (getStringFromSearch(search, 'sequenceType') as SequenceType | undefined) ?? defaults.sequenceType,
            excludeSet:
                (getStringFromSearch(search, 'excludeSet') as ExcludeSetName | undefined) ?? defaults.excludeSet,
            excludeVariants: getStringFromSearch(search, 'excludeVariants')?.split('|'),
        };
    }

    protected setAnalysisSearchParams(search: URLSearchParams, analysis: WasapUntrackedFilter) {
        setSearchFromString(search, 'sequenceType', analysis.sequenceType);
        setSearchFromString(search, 'excludeSet', analysis.excludeSet);
        if (analysis.excludeSet === 'custom') {
            setSearchFromString(search, 'excludeVariants', analysis.excludeVariants?.join('|'));
        }
    }
}
