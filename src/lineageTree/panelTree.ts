import { getFoundedClade, getRecombinantOrigin, type Lineage, type LineageTree } from './lineageTree';

export type PanelTreeNode = {
    name: string;
    /**
     * The immediate parent lineages in the full tree: the parent, or for a recombinant, the
     * lineages it's a recombinant of. Empty for the root lineage.
     */
    parents: string[];
    /** Whether the lineage is a recombinant itself (not a sublineage of one). */
    recombinant: boolean;
    /** `YYYY-MM-DD`; `undefined` for lineages without a designated sequence in the tree. */
    designationDate: string | undefined;
    /** The clade that starts with the lineage (see `getFoundedClade`), if any. */
    clade: string | undefined;
    /**
     * `false` for the lineages shown for context: where lineages of the panel branch apart, the
     * lineages on the way between them that start a clade, and the recombinant heading a group.
     */
    inPanel: boolean;
    /** The lineages left out between the node above and this one, from the top down. */
    skipped: string[];
    children: PanelTreeNode[];
};

export type PanelTree = {
    /** The lineages that don't descend from a recombinant. */
    lineages: PanelTreeNode[];
    /** One tree per recombinant that the lineages of the panel descend from, headed by it. */
    recombinants: PanelTreeNode[];
    /** The lineages of the panel that aren't in the tree. */
    missing: string[];
};

/**
 * The lineages of a panel as they hang together in the lineage tree. Of the other lineages, it
 * only keeps those that give the tree its shape: the common ancestors where lineages of the panel
 * branch apart, and the lineages on the way between them that start a clade (like `JN.1`). Each
 * lineage goes below the closest kept lineage above it.
 *
 * Recombinants and their sublineages go into a separate tree per recombinant, as the lineage tree
 * puts recombinants below its root, which says nothing about where they come from. Such a tree is
 * headed by its recombinant even if the panel only has sublineages of it.
 *
 * Lineages keep the order of the panel, with the context lineages where they first come up.
 */
export function buildPanelTree(lineageTree: LineageTree, panel: readonly string[]): PanelTree {
    const missing: string[] = [];
    const groups = new Map<string | undefined, Lineage[]>();
    for (const name of new Set(panel)) {
        const lineage = lineageTree.lineages.get(name);
        if (lineage === undefined) {
            missing.push(name);
            continue;
        }
        const origin = getRecombinantOrigin(lineageTree, name)?.name;
        groups.set(origin, [...(groups.get(origin) ?? []), lineage]);
    }

    const lineages: PanelTreeNode[] = [];
    const recombinants: PanelTreeNode[] = [];
    for (const [origin, members] of groups) {
        (origin === undefined ? lineages : recombinants).push(...buildGroup(lineageTree, members, origin));
    }
    return { lineages, recombinants, missing };
}

/** The trees of the lineages of the panel that descend from the recombinant `origin` (or none). */
function buildGroup(lineageTree: LineageTree, members: Lineage[], origin: string | undefined): PanelTreeNode[] {
    const memberNames = new Set(members.map((member) => member.name));
    // from the top down to the lineage itself, starting at the recombinant if there is one
    const paths = members.map((member) => pathFromTop(lineageTree, member, origin));

    const kept = new Set(memberNames);
    if (origin !== undefined) {
        kept.add(origin);
    }

    // where the paths branch apart
    const childrenOnPaths = new Map<string, Set<string>>();
    for (const path of paths) {
        for (let i = 0; i + 1 < path.length; i++) {
            const children = childrenOnPaths.get(path[i].name) ?? new Set();
            children.add(path[i + 1].name);
            childrenOnPaths.set(path[i].name, children);
        }
    }
    for (const [name, children] of childrenOnPaths) {
        if (children.size > 1) {
            kept.add(name);
        }
    }

    // the clades started on the way down from the top kept lineage (the recombinant, or where all
    // paths meet), so not those above all of the lineages
    const top = origin !== undefined ? 0 : commonPrefixLength(paths) - 1;
    for (const path of paths) {
        for (const lineage of path.slice(top)) {
            if (getFoundedClade(lineageTree, lineage) !== undefined) {
                kept.add(lineage.name);
            }
        }
    }

    const nodes = new Map<string, PanelTreeNode>();
    const roots: PanelTreeNode[] = [];
    for (const path of paths) {
        let above: PanelTreeNode | undefined = undefined;
        let skipped: string[] = [];
        for (const lineage of path) {
            if (!kept.has(lineage.name)) {
                skipped.push(lineage.name);
                continue;
            }
            let node = nodes.get(lineage.name);
            if (node === undefined) {
                node = toNode(lineageTree, lineage, memberNames.has(lineage.name));
                nodes.set(lineage.name, node);
                if (above === undefined) {
                    // the path up to the root lineage would only be noise
                    roots.push(node);
                } else {
                    node.skipped = skipped;
                    above.children.push(node);
                }
            }
            above = node;
            skipped = [];
        }
    }
    return roots;
}

/** The lineage with its ancestors, from the top down: from the recombinant `origin`, or else the root. */
function pathFromTop(lineageTree: LineageTree, lineage: Lineage, origin: string | undefined): Lineage[] {
    const path = [lineage];
    while (path[0].name !== origin && path[0].parent !== undefined) {
        path.unshift(lineageTree.lineages.get(path[0].parent)!);
    }
    return path;
}

function commonPrefixLength(paths: Lineage[][]): number {
    let length = 0;
    while (paths.every((path) => length < path.length && path[length] === paths[0][length])) {
        length++;
    }
    return length;
}

function toNode(lineageTree: LineageTree, lineage: Lineage, inPanel: boolean): PanelTreeNode {
    return {
        name: lineage.name,
        parents: lineage.recombinantParents ?? (lineage.parent === undefined ? [] : [lineage.parent]),
        recombinant: lineage.recombinantParents !== undefined,
        designationDate: lineage.designationDate,
        clade: getFoundedClade(lineageTree, lineage),
        inPanel,
        skipped: [],
        children: [],
    };
}
