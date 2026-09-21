import { createModePageStateHandler } from './handlers/createModePageStateHandler';
import { type WasapAnalysisMode, type WasapFilter } from './wasapAnalysisFilter';
import { enabledAnalysisModes, type WasapPageConfig } from '../../config/wasapPageConfig';
import { formatUrl } from '../../util/formatUrl';
import { type PageStateHandler } from '../PageStateHandler';
import { getStringFromSearch } from '../urlSearchParams';

/**
 * The page state handler of the page as it is now, with all the modes on one
 * page and the mode in the URL's search params. Each mode has its own handler
 * in `handlers/` already, this one only picks the one for the mode in the URL.
 */
export class WasapPageStateHandler implements PageStateHandler<WasapFilter> {
    private readonly config: WasapPageConfig;

    constructor(config: WasapPageConfig) {
        this.config = config;
    }

    parsePageStateFromUrl(searchParams: URLSearchParams): WasapFilter {
        const providedMode = getStringFromSearch(searchParams, 'analysisMode') as WasapAnalysisMode | undefined;
        const defaultMode = this.config.defaultAnalysisMode ?? enabledAnalysisModes(this.config)[0];

        return createModePageStateHandler(this.config, providedMode ?? defaultMode).parsePageStateFromUrl(searchParams);
    }

    toUrl(pageState: WasapFilter): string {
        return formatUrl(this.config.path, this.toSearchParams(pageState));
    }

    toSearchParams(pageState: WasapFilter): URLSearchParams {
        const { mode } = pageState.analysis;

        return new URLSearchParams([
            ['analysisMode', mode],
            ...createModePageStateHandler(this.config, mode).toSearchParams(pageState),
        ]);
    }

    getDefaultPageUrl(): string {
        return this.config.path;
    }
}
