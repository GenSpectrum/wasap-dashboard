import { ANALYSIS_MODE, type AnalysisMode } from './analysisFilter';

/**
 * Every analysis mode is its own page, `<organism path>/<segment>`. The segment
 * is what shows up in the URL, so it can differ from the internal mode id.
 */
const MODE_SEGMENTS = {
    manual: 'manual',
    variant: 'variant',
    resistance: 'resistance',
    untracked: 'untracked',
    collection: 'collection',
    deconvolution: 'prevalence',
    cooccurrence: 'cooccurrence',
} as const satisfies Record<AnalysisMode, string>;

const MODE_LABELS = {
    manual: 'Manual',
    variant: 'Explorer',
    resistance: 'Resistance',
    untracked: 'Untracked',
    collection: 'Collection',
    deconvolution: 'Prevalence',
    cooccurrence: 'Co-occurrence',
} as const satisfies Record<AnalysisMode, string>;

/**
 * The full name of each mode, with the group it belongs to spelled out: the title of its page,
 * where the short label of the navigation would lack the context the group gives it there.
 */
const MODE_TITLES = {
    manual: 'Manual Mutations',
    variant: 'Lineage Explorer',
    resistance: 'Resistance Mutations',
    untracked: 'Untracked Mutations',
    collection: 'Mutation Collections',
    deconvolution: 'Lineage Prevalence',
    cooccurrence: 'Co-occurrence',
} as const satisfies Record<AnalysisMode, string>;

/**
 * The icon of each mode, in the navigation and in the title of its page.
 * Spelled out in full, so that Tailwind finds the icon classes in the source.
 */
const MODE_ICONS = {
    deconvolution: 'mdi--chart-areaspline',
    variant: 'wasap--mutation-row',
    cooccurrence: 'mdi--set-center',
    resistance: 'mdi--shield-outline',
    untracked: 'mdi--radar',
    manual: 'mdi--pencil-outline',
    collection: 'mdi--folder-multiple-outline',
} as const satisfies Record<AnalysisMode, string>;

/**
 * The groups the navigation lists the modes in, in its order. Every mode is in exactly one
 * group; the modes an organism doesn't have are left out of the navigation.
 */
export const MODE_GROUPS: { label?: string; modes: AnalysisMode[] }[] = [
    { label: 'Lineages', modes: ['deconvolution', 'variant'] },
    // Neither about lineages nor about single mutations, so on its own, without a label.
    { modes: ['cooccurrence'] },
    { label: 'Mutations', modes: ['resistance', 'untracked', 'manual', 'collection'] },
];

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

export function modeTitle(mode: AnalysisMode): string {
    return MODE_TITLES[mode];
}

export function modeIcon(mode: AnalysisMode): string {
    return MODE_ICONS[mode];
}
