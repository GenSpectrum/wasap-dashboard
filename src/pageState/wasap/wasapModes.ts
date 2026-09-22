import { WASAP_ANALYSIS_MODE, type WasapAnalysisMode } from './wasapAnalysisFilter';

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
} as const satisfies Record<WasapAnalysisMode, string>;

const MODE_LABELS = {
    manual: 'Manual',
    variant: 'Variant Explorer',
    resistance: 'Resistance Mutations',
    untracked: 'Untracked Mutations',
    collection: 'Collection',
} as const satisfies Record<WasapAnalysisMode, string>;

export function modeToSegment(mode: WasapAnalysisMode): string {
    return MODE_SEGMENTS[mode];
}

/** The path of the page of a mode, below the path of the organism (like `/covid`). */
export function modePath(organismPath: string, mode: WasapAnalysisMode): string {
    return `${organismPath}/${MODE_SEGMENTS[mode]}`;
}

/** The mode a URL segment stands for, or `undefined` if it is not one of ours. */
export function segmentToMode(segment: string | undefined): WasapAnalysisMode | undefined {
    return Object.values(WASAP_ANALYSIS_MODE).find((mode) => MODE_SEGMENTS[mode] === segment);
}

export function modeLabel(mode: WasapAnalysisMode): string {
    return MODE_LABELS[mode];
}
