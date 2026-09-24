import { type WasapPageConfig } from '../../../config/wasapPageConfig';
import { formatUrl } from '../../../util/formatUrl';
import { type PageStateHandler } from '../../PageStateHandler';
import {
    parseBaseFilter,
    parseDatasetFilter,
    setBaseFilterSearchParams,
    setDatasetFilterSearchParams,
} from '../baseFilter';
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

    /**
     * Whether the mean proportion can be set on the page of the mode. If not, it is
     * always the default of the mode, and not in the URL.
     */
    protected readonly hasMeanProportion: boolean = true;

    parsePageStateFromUrl(searchParams: URLSearchParams): WasapModeFilter<Analysis> {
        const analysis = this.parseAnalysis(searchParams);
        const base = this.hasMeanProportion
            ? parseBaseFilter(searchParams, this.config, getDefaultMeanProportion(analysis))
            : { ...parseDatasetFilter(searchParams, this.config), meanProportion: getDefaultMeanProportion(analysis) };
        return { base, analysis };
    }

    toSearchParams({ base, analysis }: WasapModeFilter<Analysis>): URLSearchParams {
        const search = new URLSearchParams();
        if (this.hasMeanProportion) {
            setBaseFilterSearchParams(search, base, this.config, getDefaultMeanProportion(analysis));
        } else {
            setDatasetFilterSearchParams(search, base, this.config);
        }
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
