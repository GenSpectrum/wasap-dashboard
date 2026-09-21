import { parseBaseFilter, setBaseFilterSearchParams } from './baseFilter';
import { getDefaultMeanProportion } from './defaultMeanProportion';
import { ManualPageStateHandler } from './handlers/ManualPageStateHandler';
import { ResistancePageStateHandler } from './handlers/ResistancePageStateHandler';
import { UntrackedPageStateHandler } from './handlers/UntrackedPageStateHandler';
import { VariantExplorerPageStateHandler } from './handlers/VariantExplorerPageStateHandler';
import { type WasapAnalysisFilter, type WasapAnalysisMode, type WasapFilter } from './wasapAnalysisFilter';
import { enabledAnalysisModes, isModeEnabled, type WasapPageConfig } from '../../config/wasapPageConfig';
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
            case 'variant':
                throw Error('The variant mode is handled by its own handler.');
            case 'resistance':
            case 'untracked':
                throw Error(`The ${mode} mode is handled by its own handler.`);
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
            case 'variant':
                if (!isModeEnabled(this.config, 'variant')) {
                    throw Error("The 'variant' analysis mode is not enabled.");
                }
                return new VariantExplorerPageStateHandler(this.config);
            case 'resistance':
                if (!isModeEnabled(this.config, 'resistance')) {
                    throw Error("The 'resistance' analysis mode is not enabled.");
                }
                return new ResistancePageStateHandler(this.config);
            case 'untracked':
                if (!isModeEnabled(this.config, 'untracked')) {
                    throw Error("The 'untracked' analysis mode is not enabled.");
                }
                return new UntrackedPageStateHandler(this.config);
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
