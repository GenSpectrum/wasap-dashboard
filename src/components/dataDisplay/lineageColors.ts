/**
 * Categorical colours of the lineages, in panel order: a lineage keeps its colour when another
 * one is added after it. A panel has more lineages than this only rarely; they then repeat.
 */
const LINEAGE_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

/** For what the deconvolution can't put down to any lineage of the panel. */
export const UNDETERMINED_COLOR = '#8a8a85';

/** The colour of each lineage of a panel, the same in all plots of the panel. */
export function lineageColors(lineages: Iterable<string>): Map<string, string> {
    const colors = new Map<string, string>();
    for (const lineage of lineages) {
        if (!colors.has(lineage)) {
            colors.set(lineage, LINEAGE_COLORS[colors.size % LINEAGE_COLORS.length]);
        }
    }
    return colors;
}
