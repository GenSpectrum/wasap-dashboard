import { getLineageSignature, type LineageTree } from '../lineageTree/lineageTree';

export type LineageSignatures = {
    /** The nucleotide substitutions of each lineage of the panel that is in the tree, in panel order. */
    signatures: Record<string, string[]>;
    /** The lineages of the panel that aren't in the tree (say, from an old URL). */
    missing: string[];
    /**
     * The lineages of the panel left out because an earlier one of the panel has the same signature:
     * the two can't be told apart, and the share of both goes to `sameAs`.
     */
    indistinguishable: { lineage: string; sameAs: string }[];
};

/**
 * The signatures of the lineages of a panel, from the lineage tree: all the nucleotide mutations of
 * a lineage compared to the reference (`getLineageSignature`), without deletions, as LolliPop
 * leaves them out — and Nextclade places deletions in repeats one base further right than the
 * W-ASAP reads do.
 *
 * Lineages with the same signature (a child with only deletions of its own, say) can't be told apart:
 * the fit would give one of them all of their share and the other a confident-looking 0 %. So only
 * the first of them in the panel is kept.
 */
export function lineageSignatures(lineageTree: LineageTree, panel: readonly string[]): LineageSignatures {
    const signatures: Record<string, string[]> = {};
    const missing: string[] = [];
    const indistinguishable: LineageSignatures['indistinguishable'] = [];
    const lineageBySignature = new Map<string, string>();
    for (const name of panel) {
        const lineage = lineageTree.lineages.get(name);
        if (lineage === undefined) {
            missing.push(name);
            continue;
        }
        const signature = nucleotideSubstitutions(getLineageSignature(lineage).nucleotide);
        const key = [...signature].sort().join();
        const sameAs = lineageBySignature.get(key);
        if (sameAs !== undefined) {
            indistinguishable.push({ lineage: name, sameAs });
            continue;
        }
        lineageBySignature.set(key, name);
        signatures[name] = signature;
    }
    return { signatures, missing, indistinguishable };
}

/** Substitutions like `C241T`, without deletions (`A11288-`) and ambiguous codes. */
export function nucleotideSubstitutions(mutations: readonly string[]): string[] {
    return mutations.filter((mutation) => /^[ACGT]\d+[ACGT]$/.test(mutation));
}
