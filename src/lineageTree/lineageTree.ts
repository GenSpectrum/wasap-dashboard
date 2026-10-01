import { DESIGNATION_DATE_ATTRIBUTE, NEXTCLADE_NUCLEOTIDE_KEY, type NextcladeTreeNode } from './nextcladeTree';

/** Nucleotide mutations like `G11727A`, amino acid mutations like `S:L455S`. */
export type Mutations = {
    nucleotide: string[];
    aminoAcid: string[];
};

/**
 * A node of the Nextclade tree, cut down to what it takes to compute signatures. The Nextclade tree
 * doesn't have one node per lineage (a lineage often spans a few nodes, and its designated sequence
 * is a leaf below them), so the lineages keep the node they're placed at.
 */
type TreeNode = {
    parent: TreeNode | undefined;
    lineage: string;
    mutations: Mutations;
};

export type Lineage = {
    name: string;
    /** `undefined` only for the root lineage. */
    parent: string | undefined;
    children: string[];
    /** `YYYY-MM-DD`; `undefined` for the few lineages without a designated sequence in the tree. */
    designationDate: string | undefined;
    /** The mutations on the way from the parent lineage to this one. */
    definingMutations: Mutations;
    /** The node of the tree the lineage is placed at; see `getLineageSignature`. */
    treeNode: TreeNode;
};

export type LineageTree = {
    root: string;
    lineages: Map<string, Lineage>;
};

/**
 * Builds the lineage tree from a Nextclade reference tree.
 *
 * Each lineage is placed at the leaf named after its designated sequence, or, for a lineage without
 * one, at the topmost node of the lineage. Its parent is the lineage of the closest node above that
 * isn't of the lineage itself. Going by the leaf matters: a few lineages (like `B.1`) also show up at
 * a second place in the tree, and the leaf is where the designation is.
 */
export function buildLineageTree(root: NextcladeTreeNode, lineageAttribute: string): LineageTree {
    const placements = new Map<string, { node: TreeNode; designationDate: string | undefined }>();

    const stack: { node: NextcladeTreeNode; parent: TreeNode | undefined }[] = [{ node: root, parent: undefined }];
    while (stack.length > 0) {
        const { node, parent } = stack.pop()!;
        const lineage = node.node_attrs[lineageAttribute]?.value ?? parent?.lineage;
        if (lineage === undefined) {
            throw new Error(`The root node of the Nextclade tree has no '${lineageAttribute}' attribute`);
        }
        const treeNode: TreeNode = { parent, lineage, mutations: toMutations(node.branch_attrs?.mutations ?? {}) };

        const isLeaf = (node.children ?? []).length === 0;
        if (isLeaf && node.name === lineage) {
            placements.set(lineage, {
                node: treeNode,
                designationDate: node.node_attrs[DESIGNATION_DATE_ATTRIBUTE]?.value,
            });
        } else if (!placements.has(lineage) && parent?.lineage !== lineage) {
            // a placeholder until the leaf of the lineage comes up (if there is one)
            placements.set(lineage, { node: treeNode, designationDate: undefined });
        }

        // reversed, so that the children are visited (and end up listed) in the order of the tree
        for (const child of [...(node.children ?? [])].reverse()) {
            stack.push({ node: child, parent: treeNode });
        }
    }

    const lineages = new Map<string, Lineage>();
    for (const [name, { node, designationDate }] of placements) {
        const segment: TreeNode[] = [];
        let current: TreeNode | undefined = node;
        while (current?.lineage === name) {
            segment.push(current);
            current = current.parent;
        }
        lineages.set(name, {
            name,
            parent: current?.lineage,
            children: [],
            designationDate,
            definingMutations: accumulateMutations(segment.reverse()),
            treeNode: node,
        });
    }

    let rootLineage: string | undefined;
    for (const lineage of lineages.values()) {
        if (lineage.parent === undefined) {
            rootLineage = lineage.name;
        } else {
            lineages.get(lineage.parent)!.children.push(lineage.name);
        }
    }

    return { root: rootLineage!, lineages };
}

/**
 * All the mutations of the lineage compared to the reference, i.e. the mutations from the root of
 * the tree down to the lineage, where a later mutation at a position overrides an earlier one (and a
 * reversion to the reference drops it).
 */
export function getLineageSignature(lineage: Lineage): Mutations {
    const path: TreeNode[] = [];
    for (let node: TreeNode | undefined = lineage.treeNode; node !== undefined; node = node.parent) {
        path.push(node);
    }
    return accumulateMutations(path.reverse());
}

function toMutations(mutationsByGene: Record<string, string[]>): Mutations {
    const result: Mutations = { nucleotide: [], aminoAcid: [] };
    for (const [gene, mutations] of Object.entries(mutationsByGene)) {
        if (gene === NEXTCLADE_NUCLEOTIDE_KEY) {
            result.nucleotide.push(...mutations);
        } else {
            result.aminoAcid.push(...mutations.map((mutation) => `${gene}:${mutation}`));
        }
    }
    return result;
}

/** Combines the mutations of consecutive nodes, ordered from top to bottom. */
function accumulateMutations(nodes: TreeNode[]): Mutations {
    return {
        nucleotide: accumulate(nodes.map((node) => node.mutations.nucleotide)),
        aminoAcid: accumulate(nodes.map((node) => node.mutations.aminoAcid)),
    };
}

const MUTATION_PATTERN = /^(.*?)(\d+)(.)$/;

function accumulate(mutationLists: string[][]): string[] {
    const byPosition = new Map<string, { prefix: string; position: number; to: string; from: string }>();
    for (const mutations of mutationLists) {
        for (const mutation of mutations) {
            const match = MUTATION_PATTERN.exec(mutation);
            if (match === null) {
                throw new Error(`Unexpected mutation in the Nextclade tree: '${mutation}'`);
            }
            const [, prefixAndFrom, position, to] = match;
            // the prefix is the gene of an amino acid mutation (`S:`), the last character the original symbol
            const prefix = prefixAndFrom.slice(0, -1);
            const key = `${prefix}${position}`;
            const from = byPosition.get(key)?.from ?? prefixAndFrom.slice(-1);
            if (to === from) {
                byPosition.delete(key);
            } else {
                byPosition.set(key, { prefix, position: Number(position), to, from });
            }
        }
    }
    return [...byPosition.values()]
        .sort((a, b) => a.prefix.localeCompare(b.prefix) || a.position - b.position)
        .map(({ prefix, from, position, to }) => `${prefix}${from}${position}${to}`);
}
