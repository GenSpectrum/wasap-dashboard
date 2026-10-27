import { ANALYSIS_MODE, type AnalysisMode } from './analysisFilter';

/**
 * Every analysis mode is its own page, `<organism path>/<segment>`. The segment
 * is what shows up in the URL, so it can differ from the internal mode id.
 */
const MODE_SEGMENTS = {
    manual: 'manual',
    variant: 'variantExplorer',
    resistance: 'resistance',
    untracked: 'untracked',
    collection: 'collection',
    deconvolution: 'lineagePrevalence',
    cooccurrence: 'cooccurrence',
} as const satisfies Record<AnalysisMode, string>;

const MODE_LABELS = {
    manual: 'Manual',
    variant: 'Variant Explorer',
    resistance: 'Resistance Mutations',
    untracked: 'Untracked Mutations',
    collection: 'Collection',
    deconvolution: 'Lineage Prevalence',
    cooccurrence: 'Co-occurrence',
} as const satisfies Record<AnalysisMode, string>;

export function modeToSegment(mode: AnalysisMode): string {
    return MODE_SEGMENTS[mode];
}

/** The path of the page of a mode, below the path of the organism (like `/covid`). */
export function modePath(organismPath: string, mode: AnalysisMode): string {
    return `${organismPath}/${MODE_SEGMENTS[mode]}`;
}

/** The mode a URL segment stands for, or `undefined` if it is not one of ours. */
export function segmentToMode(segment: string | undefined): AnalysisMode | undefined {
    return Object.values(ANALYSIS_MODE).find((mode) => MODE_SEGMENTS[mode] === segment);
}

export function modeLabel(mode: AnalysisMode): string {
    return MODE_LABELS[mode];
}
