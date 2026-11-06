export type SignatureOverlap = {
    lineages: string[];
    /** The number of mutations in the signature of each lineage. */
    sizes: number[];
    /** The mutations of each lineage that no other lineage of the panel has. */
    unique: string[][];
    /** `shared[i][j]`: the number of mutations the signatures of lineages `i` and `j` have in common. */
    shared: number[][];
    /** `jaccard[i][j]`: shared / union of the signatures of lineages `i` and `j`. */
    jaccard: number[][];
};

/**
 * How much the signatures of the lineages of a panel overlap, pair by pair. The fewer mutations
 * tell two lineages apart, the harder it is for the deconvolution to split their shares.
 */
export function signatureOverlap(signatures: Record<string, readonly string[]>): SignatureOverlap {
    const lineages = Object.keys(signatures);
    const sets = lineages.map((lineage) => new Set(signatures[lineage]));
    const shared = sets.map((a) => sets.map((b) => [...a].filter((mutation) => b.has(mutation)).length));
    const jaccard = sets.map((a, i) =>
        sets.map((b, j) => {
            const union = a.size + b.size - shared[i][j];
            return union === 0 ? 1 : shared[i][j] / union;
        }),
    );
    const unique = sets.map((set, i) =>
        [...set].filter((mutation) => sets.every((other, j) => j === i || !other.has(mutation))),
    );
    return { lineages, sizes: sets.map((set) => set.size), unique, shared, jaccard };
}
