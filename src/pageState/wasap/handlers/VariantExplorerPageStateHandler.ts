import { WasapModePageStateHandler } from './WasapModePageStateHandler';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { type SequenceType } from '../../../types/dashboardComponents';
import { getStringFromSearch, setSearchFromString } from '../../urlSearchParams';
import { type SignatureType, type VariantTimeFrame, type WasapVariantFilter } from '../wasapAnalysisFilter';

export class VariantExplorerPageStateHandler extends WasapModePageStateHandler<WasapVariantFilter> {
    constructor(protected readonly config: WasapPageConfigFor<'variant'>) {
        super(config, 'variant');
    }

    // What isn't worth showing is left out by the mutations to exclude instead (`excludeNearlyFixed`, …).
    protected readonly hasMeanProportion = false;

    protected parseAnalysis(search: URLSearchParams): WasapVariantFilter {
        const defaults = this.config.filterDefaults.variant;
        const includeSublineagesForJaccard = getStringFromSearch(search, 'includeSublineagesForJaccard');
        const backgroundLineages = getStringFromSearch(search, 'backgroundLineages');

        return {
            mode: 'variant',
            signatureType:
                (getStringFromSearch(search, 'signatureType') as SignatureType | undefined) ?? defaults.signatureType,
            sequenceType:
                (getStringFromSearch(search, 'sequenceType') as SequenceType | undefined) ?? defaults.sequenceType,
            variant: getStringFromSearch(search, 'variant') ?? defaults.variant,
            minProportion: Number(getStringFromSearch(search, 'minProportion') ?? defaults.minProportion),
            minCount: Number(getStringFromSearch(search, 'minCount') ?? defaults.minCount),
            minJaccard: Number(getStringFromSearch(search, 'minJaccard') ?? defaults.minJaccard),
            timeFrame: (getStringFromSearch(search, 'timeFrame') as VariantTimeFrame | undefined) ?? defaults.timeFrame,
            lineage: getStringFromSearch(search, 'lineage') ?? defaults.lineage,
            newMutationsOnly: getStringFromSearch(search, 'newMutationsOnly') === 'true',
            includeSublineagesForJaccard:
                includeSublineagesForJaccard !== undefined
                    ? includeSublineagesForJaccard !== 'false'
                    : defaults.includeSublineagesForJaccard,
            backgroundLineages:
                backgroundLineages === undefined
                    ? (defaults.backgroundLineages ?? [])
                    : backgroundLineages.split('|').filter((lineage) => lineage !== ''),
            excludeNearlyFixed: getStringFromSearch(search, 'excludeNearlyFixed') !== 'false',
            excludeDeletions: getStringFromSearch(search, 'excludeDeletions') !== 'false',
        };
    }

    protected setAnalysisSearchParams(search: URLSearchParams, analysis: WasapVariantFilter) {
        setSearchFromString(search, 'sequenceType', analysis.sequenceType);
        setSearchFromString(search, 'signatureType', analysis.signatureType);
        if (analysis.signatureType === 'predefined') {
            setSearchFromString(search, 'lineage', analysis.lineage);
            if (analysis.newMutationsOnly) {
                setSearchFromString(search, 'newMutationsOnly', 'true');
            }
            if (analysis.includeSublineagesForJaccard === false) {
                setSearchFromString(search, 'includeSublineagesForJaccard', 'false');
            }
            setSearchFromString(search, 'minJaccard', String(analysis.minJaccard));
            setSearchFromString(search, 'timeFrame', analysis.timeFrame);
        } else {
            setSearchFromString(search, 'variant', analysis.variant);
            setSearchFromString(search, 'minProportion', String(analysis.minProportion));
            setSearchFromString(search, 'minCount', String(analysis.minCount));
            setSearchFromString(search, 'minJaccard', String(analysis.minJaccard));
            setSearchFromString(search, 'timeFrame', analysis.timeFrame);
        }
        // Only when not the default, but then even when empty, so that the default can be taken out.
        const backgroundLineages = (analysis.backgroundLineages ?? []).join('|');
        if (backgroundLineages !== (this.config.filterDefaults.variant.backgroundLineages ?? []).join('|')) {
            search.set('backgroundLineages', backgroundLineages);
        }
        if (analysis.excludeNearlyFixed === false) {
            setSearchFromString(search, 'excludeNearlyFixed', 'false');
        }
        if (analysis.excludeDeletions === false) {
            setSearchFromString(search, 'excludeDeletions', 'false');
        }
    }
}
