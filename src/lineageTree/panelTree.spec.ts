import { describe, expect, it } from 'vitest';

import { buildLineageTree } from './lineageTree';
import { type NextcladeTreeNode } from './nextcladeTree';
import { buildPanelTree, type PanelTreeNode } from './panelTree';

/* eslint-disable @typescript-eslint/naming-convention -- the field names of the Auspice JSON format */

/** A lineage with its leaf, and its sublineages below it. */
function lineage(
    name: string,
    clade: string,
    children: NextcladeTreeNode[] = [],
    designationDate?: string,
): NextcladeTreeNode {
    return {
        name: `NODE_${name}`,
        node_attrs: { lineage: { value: name }, clade: { value: clade } },
        children: [
            {
                name,
                node_attrs: {
                    lineage: { value: name },
                    clade: { value: clade },
                    designation_date: designationDate === undefined ? undefined : { value: designationDate },
                },
            },
            ...children,
        ],
    };
}

/** `A.1.1` and `X.1` start a clade. */
const lineageTree = buildLineageTree(
    lineage('A', '1A', [
        lineage(
            'A.1',
            '1A',
            [lineage('A.1.1', '2B', [lineage('A.1.1.1', '2B', [lineage('A.1.1.1.1', '2B')])]), lineage('A.1.2', '1A')],
            '2020-02-01',
        ),
        lineage('A.2', '1A'),
        lineage(
            'X',
            'recombinant',
            [lineage('X.1', '3C', [lineage('X.1.1', '3C')]), lineage('X.2', 'recombinant')],
            '2021-01-01',
        ),
        lineage('Y', 'recombinant', [lineage('Y.1', 'recombinant')]),
    ]),
    'lineage',
    new Map([
        ['X', ['A.1', 'A.2']],
        ['Y', ['X', 'A.2']],
    ]),
    'clade',
);

/** The nodes as `name [via skipped]` with their children, to compare the shape at a glance. */
function shape(nodes: PanelTreeNode[]): unknown[] {
    return nodes.map((node) => {
        const label = `${node.inPanel ? '' : '('}${node.name}${node.inPanel ? '' : ')'}${
            node.skipped.length > 0 ? ` via ${node.skipped.join(',')}` : ''
        }`;
        return node.children.length > 0 ? { [label]: shape(node.children) } : label;
    });
}

describe('buildPanelTree', () => {
    it('puts each lineage below the closest kept lineage above it', () => {
        const panelTree = buildPanelTree(lineageTree, ['A.1.1', 'A.1.1.1.1']);

        expect(shape(panelTree.lineages)).toEqual([{ 'A.1.1': ['A.1.1.1.1 via A.1.1.1'] }]);
        expect(panelTree.recombinants).toEqual([]);
    });

    it('adds the common ancestors where lineages branch apart', () => {
        const panelTree = buildPanelTree(lineageTree, ['A.1.2', 'A.2']);

        expect(shape(panelTree.lineages)).toEqual([{ '(A)': ['A.1.2 via A.1', 'A.2'] }]);
    });

    it('adds the lineages that start a clade on the way, but not above the top common ancestor', () => {
        const panelTree = buildPanelTree(lineageTree, ['A.1.1.1', 'A.1.2']);

        expect(shape(panelTree.lineages)).toEqual([{ '(A.1)': [{ '(A.1.1)': ['A.1.1.1'] }, 'A.1.2'] }]);
        expect(panelTree.lineages[0].children[0].clade).toBe('2B');
    });

    it('shows a single lineage on its own', () => {
        const panelTree = buildPanelTree(lineageTree, ['A.1.1.1']);

        expect(shape(panelTree.lineages)).toEqual(['A.1.1.1']);
    });

    it('keeps the order of the panel and drops duplicates', () => {
        const panelTree = buildPanelTree(lineageTree, ['A.1.2', 'A.2', 'A.1', 'A.1.1', 'A.2']);

        expect(shape(panelTree.lineages)).toEqual([{ '(A)': [{ 'A.1': ['A.1.2', 'A.1.1'] }, 'A.2'] }]);
    });

    it('puts recombinants into a tree each, apart from the other lineages', () => {
        const panelTree = buildPanelTree(lineageTree, ['A', 'X', 'X.1.1', 'Y.1', 'Y']);

        expect(shape(panelTree.lineages)).toEqual(['A']);
        expect(shape(panelTree.recombinants)).toEqual([{ X: [{ '(X.1)': ['X.1.1'] }] }, { Y: ['Y.1'] }]);
    });

    it('heads a tree with its recombinant also when the panel only has sublineages of it', () => {
        const panelTree = buildPanelTree(lineageTree, ['X.1.1']);

        expect(shape(panelTree.recombinants)).toEqual([{ '(X)': [{ '(X.1)': ['X.1.1'] }] }]);
        expect(panelTree.recombinants[0].parents).toEqual(['A.1', 'A.2']);
    });

    it('gives the immediate parents and the designation date', () => {
        const panelTree = buildPanelTree(lineageTree, ['A.1', 'Y']);

        expect(panelTree.lineages[0]).toMatchObject({
            parents: ['A'],
            recombinant: false,
            designationDate: '2020-02-01',
        });
        expect(panelTree.recombinants[0]).toMatchObject({
            parents: ['X', 'A.2'],
            recombinant: true,
            designationDate: undefined,
        });
    });

    it('lists the lineages that are not in the tree', () => {
        const panelTree = buildPanelTree(lineageTree, ['A.1', 'Q.1']);

        expect(panelTree.missing).toEqual(['Q.1']);
        expect(shape(panelTree.lineages)).toEqual(['A.1']);
    });
});
