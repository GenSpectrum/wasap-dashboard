import { describe, expect, it } from 'vitest';

import { buildLineageTree, getLineageSignature, getRecombinantOrigin } from './lineageTree';
import { type NextcladeTreeNode } from './nextcladeTree';

/* eslint-disable @typescript-eslint/naming-convention -- the field names of the Auspice JSON format */

function node(
    name: string,
    lineage: string,
    mutations: Record<string, string[]>,
    children: NextcladeTreeNode[] = [],
    designationDate?: string,
): NextcladeTreeNode {
    return {
        name,
        node_attrs: {
            lineage: { value: lineage },
            designation_date: designationDate === undefined ? undefined : { value: designationDate },
        },
        branch_attrs: { mutations },
        children,
    };
}

/**
 * Shaped like the Nextclade tree: lineages span internal nodes, with a leaf named after each one,
 * `A.1` also shows up a second time below `A.2`, and `A.3` has no leaf.
 */
const tree = node('NODE_0', 'A', {}, [
    node('A', 'A', {}, [], '2020-01-01'),
    node('NODE_1', 'A.1', { nuc: ['C100T'], S: ['D614G'] }, [
        node('NODE_2', 'A.1', { nuc: ['G200A'] }, [
            node('A.1', 'A.1', {}, [], '2020-02-01'),
            node('A.1.1', 'A.1.1', { nuc: ['T100C', 'A300G'], ORF1a: ['T10I'] }, [], '2020-03-01'),
        ]),
    ]),
    node('NODE_3', 'A.2', { nuc: ['A400G'] }, [
        node('A.2', 'A.2', {}, [], '2020-04-01'),
        node('NODE_4', 'A.1', { nuc: ['A500G'] }, [node('A.1.2', 'A.1.2', { nuc: ['A600G'] }, [], '2020-05-01')]),
    ]),
    node('NODE_5', 'A.3', { nuc: ['A700G'] }, [node('A.3.1', 'A.3.1', { nuc: ['A800G'] }, [], '2020-06-01')]),
]);

describe('buildLineageTree', () => {
    const lineageTree = buildLineageTree(tree, 'lineage');
    const lineage = (name: string) => lineageTree.lineages.get(name)!;

    it('has one entry per lineage, with the root lineage as root', () => {
        expect(lineageTree.root).toBe('A');
        expect([...lineageTree.lineages.keys()].sort()).toEqual(['A', 'A.1', 'A.1.1', 'A.1.2', 'A.2', 'A.3', 'A.3.1']);
    });

    it('links parents and children in the order of the tree', () => {
        expect(lineage('A').parent).toBeUndefined();
        expect(lineage('A').children).toEqual(['A.1', 'A.2', 'A.3']);
        expect(lineage('A.1').children).toEqual(['A.1.1', 'A.1.2']);
        expect(lineage('A.1.2').parent).toBe('A.1');
    });

    it('places a lineage at its leaf, not at another place it shows up', () => {
        expect(lineage('A.1').parent).toBe('A');
        expect(lineage('A.1').designationDate).toBe('2020-02-01');
        expect(lineage('A.1').definingMutations).toEqual({ nucleotide: ['C100T', 'G200A'], aminoAcid: ['S:D614G'] });
    });

    it('places a lineage without a leaf at its topmost node', () => {
        expect(lineage('A.3').parent).toBe('A');
        expect(lineage('A.3').designationDate).toBeUndefined();
        expect(lineage('A.3').definingMutations).toEqual({ nucleotide: ['A700G'], aminoAcid: [] });
        expect(lineage('A.3.1').parent).toBe('A.3');
    });

    it('keeps the mutations from the parent lineage, reversions included', () => {
        expect(lineage('A.1.1').definingMutations).toEqual({
            nucleotide: ['T100C', 'A300G'],
            aminoAcid: ['ORF1a:T10I'],
        });
    });

    it('computes the signature along the tree, with reversions dropped', () => {
        expect(getLineageSignature(lineage('A.1.1'))).toEqual({
            nucleotide: ['G200A', 'A300G'],
            aminoAcid: ['ORF1a:T10I', 'S:D614G'],
        });
        // along the place in the tree where it is, not via the placement of its parent lineage
        expect(getLineageSignature(lineage('A.1.2'))).toEqual({
            nucleotide: ['A400G', 'A500G', 'A600G'],
            aminoAcid: [],
        });
    });

    it('lets a later mutation at a position override an earlier one', () => {
        const overriding = node('NODE_0', 'A', {}, [
            node('B', 'B', { nuc: ['C100T'] }, [node('C', 'C', { nuc: ['T100G'] }, [])]),
        ]);
        const result = buildLineageTree(overriding, 'lineage');

        expect(getLineageSignature(result.lineages.get('C')!).nucleotide).toEqual(['C100G']);
    });
});

describe('recombinants', () => {
    // like in the Nextclade tree, the recombinant X hangs below the root lineage
    const treeWithRecombinant = node('NODE_0', 'A', {}, [
        node('A.1', 'A.1', { nuc: ['C100T'] }, []),
        node('A.2', 'A.2', { nuc: ['A400G'] }, []),
        node('NODE_1', 'X', { nuc: ['C100T', 'A400G'] }, [
            node('X', 'X', {}, []),
            node('X.1', 'X.1', { nuc: ['A900G'] }, [node('X.1.1', 'X.1.1', { nuc: ['A950G'] }, [])]),
        ]),
    ]);
    const recombinantParents = new Map([
        ['X', ['A.1', 'A.2', 'Z.9']],
        ['Y', ['A.1', 'A.2']],
    ]);
    const lineageTree = buildLineageTree(treeWithRecombinant, 'lineage', recombinantParents);
    const lineage = (name: string) => lineageTree.lineages.get(name)!;

    it('records the parents of a recombinant, also those missing from the tree', () => {
        expect(lineage('X').recombinantParents).toEqual(['A.1', 'A.2', 'Z.9']);
        expect(lineage('X').parent).toBe('A');
    });

    it('leaves the sublineages of a recombinant and other lineages without parents', () => {
        expect(lineage('X.1').recombinantParents).toBeUndefined();
        expect(lineage('A.1').recombinantParents).toBeUndefined();
    });

    it('records the recombinants of a parent', () => {
        expect(lineage('A.1').recombinantChildren).toEqual(['X']);
        expect(lineage('A.2').recombinantChildren).toEqual(['X']);
        expect(lineage('X').recombinantChildren).toEqual([]);
    });

    it('leaves out recombinants that are not in the tree', () => {
        expect(lineageTree.lineages.has('Y')).toBe(false);
    });

    it('finds the recombinant a lineage descends from', () => {
        expect(getRecombinantOrigin(lineageTree, 'X')?.name).toBe('X');
        expect(getRecombinantOrigin(lineageTree, 'X.1.1')?.name).toBe('X');
        expect(getRecombinantOrigin(lineageTree, 'A.1')).toBeUndefined();
        expect(getRecombinantOrigin(lineageTree, 'unknown')).toBeUndefined();
    });

    it('builds without recombinant parents', () => {
        const withoutParents = buildLineageTree(treeWithRecombinant, 'lineage');

        expect(withoutParents.lineages.get('X')!.recombinantParents).toBeUndefined();
        expect(withoutParents.lineages.get('A.1')!.recombinantChildren).toEqual([]);
    });
});
