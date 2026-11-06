export type SignatureOverlap = {
    lineages: string[];
    /** The mutations all lineages of the panel have; the other fields leave them out. */
    common: string[];
    /** The number of mutations in the whole signature of each lineage. */
    totalSizes: number[];
    /** The number of mutations in the signature of each lineage, without the common ones. */
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
 * tell two lineages apart, the harder it is for the deconvolution to split their shares. The
 * mutations all of them have are counted apart, as they don't tell any of them apart.
 */
export function signatureOverlap(signatures: Record<string, readonly string[]>): SignatureOverlap {
    const lineages = Object.keys(signatures);
    const fullSets = lineages.map((lineage) => new Set(signatures[lineage]));
    const common =
        fullSets.length < 2 ? [] : [...fullSets[0]].filter((mutation) => fullSets.every((set) => set.has(mutation)));
    const commonSet = new Set(common);
    const sets = fullSets.map((set) => new Set([...set].filter((mutation) => !commonSet.has(mutation))));
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
    return {
        lineages,
        common,
        totalSizes: fullSets.map((set) => set.size),
        sizes: sets.map((set) => set.size),
        unique,
        shared,
        jaccard,
    };
}
