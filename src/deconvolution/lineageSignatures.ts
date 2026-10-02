import { getLineageSignature, type LineageTree } from '../lineageTree/lineageTree';

export type LineageSignatures = {
    /** The nucleotide substitutions of each lineage of the panel that is in the tree, in panel order. */
    signatures: Record<string, string[]>;
    /** The lineages of the panel that aren't in the tree (say, from an old URL). */
    missing: string[];
};

/**
 * The signatures of the lineages of a panel, from the lineage tree: all the nucleotide mutations of
 * a lineage compared to the reference (`getLineageSignature`), without deletions, as LolliPop
 * leaves them out — and Nextclade places deletions in repeats one base further right than the
 * W-ASAP reads do.
 */
export function lineageSignatures(lineageTree: LineageTree, panel: readonly string[]): LineageSignatures {
    const signatures: Record<string, string[]> = {};
    const missing: string[] = [];
    for (const name of panel) {
        const lineage = lineageTree.lineages.get(name);
        if (lineage === undefined) {
            missing.push(name);
        } else {
            signatures[name] = nucleotideSubstitutions(getLineageSignature(lineage).nucleotide);
        }
    }
    return { signatures, missing };
}

/** Substitutions like `C241T`, without deletions (`A11288-`) and ambiguous codes. */
export function nucleotideSubstitutions(mutations: readonly string[]): string[] {
    return mutations.filter((mutation) => /^[ACGT]\d+[ACGT]$/.test(mutation));
}
