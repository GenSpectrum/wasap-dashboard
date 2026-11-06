export type SignatureOverlap = {
    lineages: string[];
    /** The number of mutations in the signature of each lineage. */
    sizes: number[];
    /** The mutations of each lineage that no other lineage of the panel has. */
    unique: string[][];
    /** `shared[i][j]`: the number of mutations the signatures of lineages `i` and `j` have in common. */
    shared: number[][];
    /** `distinguishing[i][j]`: the number of mutations only one of lineages `i` and `j` has. */
    distinguishing: number[][];
    /** `onlyIn[i][j]`: the mutations of lineage `i` that lineage `j` doesn't have. */
    onlyIn: string[][][];
};

/**
 * How much the signatures of the lineages of a panel overlap, pair by pair. The fewer mutations
 * tell two lineages apart, the harder it is for the deconvolution to split their shares.
 */
export function signatureOverlap(signatures: Record<string, readonly string[]>): SignatureOverlap {
    const lineages = Object.keys(signatures);
    const sets = lineages.map((lineage) => new Set(signatures[lineage]));
    const shared = sets.map((a) => sets.map((b) => [...a].filter((mutation) => b.has(mutation)).length));
    const distinguishing = sets.map((a, i) => sets.map((b, j) => a.size + b.size - 2 * shared[i][j]));
    const onlyIn = sets.map((a) => sets.map((b) => [...a].filter((mutation) => !b.has(mutation))));
    const unique = sets.map((set, i) =>
        [...set].filter((mutation) => sets.every((other, j) => j === i || !other.has(mutation))),
    );
    return { lineages, sizes: sets.map((set) => set.size), unique, shared, distinguishing, onlyIn };
}

/** The mutations that tell two lineages apart (those only one of them has), by position. */
export function distinguishingMutations(overlap: SignatureOverlap, i: number, j: number): string[] {
    return [...overlap.onlyIn[i][j], ...overlap.onlyIn[j][i]].sort((a, b) => position(a) - position(b));
}

function position(mutation: string): number {
    return Number(/\d+/.exec(mutation)?.[0] ?? 0);
}
