import { parseBaseFilter, setBaseFilterSearchParams } from './baseFilter';
import { getDefaultMeanProportion } from './defaultMeanProportion';
import { ManualPageStateHandler } from './handlers/ManualPageStateHandler';
import {
    type ExcludeSetName,
    type SignatureType,
    type VariantTimeFrame,
    type WasapAnalysisFilter,
    type WasapAnalysisMode,
    type WasapFilter,
} from './wasapAnalysisFilter';
import { enabledAnalysisModes, isModeEnabled, type WasapPageConfig } from '../../config/wasapPageConfig';
import { type SequenceType } from '../../types/dashboardComponents';
import { formatUrl } from '../../util/formatUrl';
import { type PageStateHandler } from '../PageStateHandler';
import { type TextFieldConfig, parseTextFiltersFromUrl } from '../textFieldConfig';
import { setSearchFromString } from '../urlSearchParams';

/**
 * The page state handler of the page as it is now, with all the modes on one
 * page (and the mode in the URL's search params). The modes are moving to
 * `handlers/`, one handler each, and are handed off to those here already.
 */
export class WasapPageStateHandler implements PageStateHandler<WasapFilter> {
    private readonly config: WasapPageConfig;
    private readonly filterConfig: TextFieldConfig[];

    constructor(config: WasapPageConfig) {
        this.config = config;
        this.filterConfig = generateWasapFilterConfig();
    }

    parsePageStateFromUrl(searchParams: URLSearchParams): WasapFilter {
        // URL-parsed settings
        const texts = parseTextFiltersFromUrl(searchParams, this.filterConfig);
        const providedSequenceType = texts.sequenceType as SequenceType | undefined;
        const providedMode = texts.analysisMode as WasapAnalysisMode | undefined;

        // config provided defaults
        const defaultMode = this.config.defaultAnalysisMode ?? enabledAnalysisModes(this.config)[0];

        const mode = providedMode ?? defaultMode;

        const modeHandler = this.getModeHandler(mode);
        if (modeHandler !== undefined) {
            return modeHandler.parsePageStateFromUrl(searchParams);
        }

        let analysis: WasapAnalysisFilter;

        switch (mode) {
            case 'manual':
                throw Error('The manual mode is handled by its own handler.');
            case 'variant': {
                if (!this.config.variantAnalysisModeEnabled) {
                    throw Error("The 'variant' analysis mode is not enabled.");
                }
                analysis = {
                    mode,
                    signatureType:
                        (texts.signatureType as SignatureType | undefined) ??
                        this.config.filterDefaults.variant.signatureType,
                    sequenceType: providedSequenceType ?? this.config.filterDefaults.variant.sequenceType,
                    variant: texts.variant ?? this.config.filterDefaults.variant.variant,
                    minProportion: Number(texts.minProportion ?? this.config.filterDefaults.variant.minProportion),
                    minCount: Number(texts.minCount ?? this.config.filterDefaults.variant.minCount),
                    minJaccard: Number(texts.minJaccard ?? this.config.filterDefaults.variant.minJaccard),
                    timeFrame:
                        (texts.timeFrame as VariantTimeFrame | undefined) ??
                        this.config.filterDefaults.variant.timeFrame,
                    collectionId:
                        texts.collectionId !== undefined
                            ? Number(texts.collectionId)
                            : this.config.filterDefaults.variant.collectionId,
                    newMutationsOnly: texts.newMutationsOnly === 'true',
                    includeSublineagesForJaccard:
                        texts.includeSublineagesForJaccard !== undefined
                            ? texts.includeSublineagesForJaccard !== 'false'
                            : this.config.filterDefaults.variant.includeSublineagesForJaccard,
                };
                break;
            }
            case 'resistance':
                if (!this.config.resistanceAnalysisModeEnabled) {
                    throw Error("The 'resistance' analysis mode is not enabled.");
                }
                analysis = {
                    mode,
                    sequenceType: 'amino acid',
                    resistanceSet: texts.resistanceSet ?? this.config.filterDefaults.resistance.resistanceSet,
                };
                break;
            case 'untracked':
                if (!this.config.untrackedAnalysisModeEnabled) {
                    throw Error("The 'untracked' analysis mode is not enabled.");
                }
                analysis = {
                    mode,
                    sequenceType: providedSequenceType ?? this.config.filterDefaults.untracked.sequenceType,
                    excludeSet:
                        (texts.excludeSet as ExcludeSetName | undefined) ??
                        this.config.filterDefaults.untracked.excludeSet,
                    excludeVariants: texts.excludeVariants?.split('|'),
                };
                break;
            case 'covSpectrumCollection':
                if (!this.config.covSpectrumCollectionAnalysisModeEnabled) {
                    throw Error("The 'covSpectrumCollection' analysis mode is not enabled.");
                }
                analysis = {
                    mode,
                    collectionId: texts.collectionId !== undefined ? Number(texts.collectionId) : undefined,
                };
                break;
            case 'collection':
                if (!this.config.collectionAnalysisModeEnabled) {
                    throw Error("The 'collection' analysis mode is not enabled.");
                }
                analysis = {
                    mode,
                    collectionId: texts.collectionId !== undefined ? Number(texts.collectionId) : undefined,
                };
                break;
        }

        const base = parseBaseFilter(searchParams, this.config, getDefaultMeanProportion(analysis));

        return { base, analysis };
    }

    toUrl(pageState: WasapFilter): string {
        return formatUrl(this.config.path, this.toSearchParams(pageState));
    }

    toSearchParams(pageState: WasapFilter): URLSearchParams {
        const modeHandler = this.getModeHandler(pageState.analysis.mode);
        if (modeHandler !== undefined) {
            return new URLSearchParams([
                ['analysisMode', pageState.analysis.mode],
                ...modeHandler.toSearchParams(pageState),
            ]);
        }

        const search = new URLSearchParams();
        const { base, analysis } = pageState;

        setBaseFilterSearchParams(search, base, this.config, getDefaultMeanProportion(analysis));

        // analysis mode dependent settings
        setSearchFromString(search, 'analysisMode', analysis.mode);
        switch (analysis.mode) {
            case 'variant':
                setSearchFromString(search, 'sequenceType', analysis.sequenceType);
                setSearchFromString(search, 'signatureType', analysis.signatureType);
                if (analysis.signatureType === 'predefined') {
                    setSearchFromString(
                        search,
                        'collectionId',
                        analysis.collectionId !== undefined ? String(analysis.collectionId) : undefined,
                    );
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
                break;
            case 'resistance':
                setSearchFromString(search, 'resistanceSet', analysis.resistanceSet);
                break;
            case 'untracked':
                setSearchFromString(search, 'sequenceType', analysis.sequenceType);
                setSearchFromString(search, 'excludeSet', analysis.excludeSet);
                if (analysis.excludeSet === 'custom') {
                    setSearchFromString(search, 'excludeVariants', analysis.excludeVariants?.join('|'));
                }
                break;
            case 'covSpectrumCollection':
                setSearchFromString(
                    search,
                    'collectionId',
                    analysis.collectionId !== undefined ? String(analysis.collectionId) : undefined,
                );
                break;
            case 'collection':
                setSearchFromString(
                    search,
                    'collectionId',
                    analysis.collectionId !== undefined ? String(analysis.collectionId) : undefined,
                );
                break;
        }

        return search;
    }

    getDefaultPageUrl(): string {
        return this.config.path;
    }

    /** The handler of the mode, if it has been moved to its own handler already. */
    private getModeHandler(mode: WasapAnalysisMode): PageStateHandler<WasapFilter> | undefined {
        switch (mode) {
            case 'manual':
                if (!isModeEnabled(this.config, 'manual')) {
                    throw Error("The 'manual' analysis mode is not enabled.");
                }
                return new ManualPageStateHandler(this.config);
            default:
                return undefined;
        }
    }
}

function generateWasapFilterConfig(): TextFieldConfig[] {
    // not really LAPIS fields, but we still want to use the URL parsing mechanism
    return [
        { lapisField: 'analysisMode' },
        { lapisField: 'sequenceType' },
        { lapisField: 'mutations' },
        { lapisField: 'variant' },
        { lapisField: 'minProportion' },
        { lapisField: 'minCount' },
        { lapisField: 'minJaccard' },
        { lapisField: 'timeFrame' },
        { lapisField: 'resistanceSet' },
        { lapisField: 'excludeSet' },
        { lapisField: 'excludeVariants' },
        { lapisField: 'collectionId' },
        { lapisField: 'signatureType' },
        { lapisField: 'newMutationsOnly' },
        { lapisField: 'includeSublineagesForJaccard' },
    ];
}
