import { type WasapPageConfig } from '../../../config/wasapPageConfig';
import { formatUrl } from '../../../util/formatUrl';
import { type PageStateHandler } from '../../PageStateHandler';
import { parseBaseFilter, setBaseFilterSearchParams } from '../baseFilter';
import { getDefaultMeanProportion } from '../defaultMeanProportion';
import { type WasapAnalysisFilter, type WasapModeFilter } from '../wasapAnalysisFilter';
import { modePath } from '../wasapModes';

/**
 * The page state handler of one analysis mode page. The settings all modes have
 * in common (see `baseFilter.ts`) are handled here, a subclass only has to say
 * how the settings of its own mode are read from and written to the URL.
 */
export abstract class WasapModePageStateHandler<Analysis extends WasapAnalysisFilter> implements PageStateHandler<
    WasapModeFilter<Analysis>
> {
    protected constructor(
        protected readonly config: WasapPageConfig,
        readonly mode: Analysis['mode'],
    ) {}

    parsePageStateFromUrl(searchParams: URLSearchParams): WasapModeFilter<Analysis> {
        const analysis = this.parseAnalysis(searchParams);
        const base = parseBaseFilter(searchParams, this.config, getDefaultMeanProportion(analysis));
        return { base, analysis };
    }

    toSearchParams({ base, analysis }: WasapModeFilter<Analysis>): URLSearchParams {
        const search = new URLSearchParams();
        setBaseFilterSearchParams(search, base, this.config, getDefaultMeanProportion(analysis));
        this.setAnalysisSearchParams(search, analysis);
        return search;
    }

    toUrl(pageState: WasapModeFilter<Analysis>): string {
        return formatUrl(this.getDefaultPageUrl(), this.toSearchParams(pageState));
    }

    getDefaultPageUrl(): string {
        return modePath(this.config.path, this.mode);
    }

    protected abstract parseAnalysis(search: URLSearchParams): Analysis;

    protected abstract setAnalysisSearchParams(search: URLSearchParams, analysis: Analysis): void;
}
