import { describe, expect, it } from 'vitest';

import { lineageSignatures, nucleotideSubstitutions } from './lineageSignatures';
import { buildLineageTree } from '../lineageTree/lineageTree';
import { type NextcladeTreeNode } from '../lineageTree/nextcladeTree';

/* eslint-disable @typescript-eslint/naming-convention -- the field names of the Auspice JSON format */

function node(name: string, lineage: string, nuc: string[], children: NextcladeTreeNode[] = []): NextcladeTreeNode {
    return { name, node_attrs: { lineage: { value: lineage } }, branch_attrs: { mutations: { nuc } }, children };
}

const lineageTree = buildLineageTree(
    node(
        'NODE_0',
        'A',
        [],
        [
            node('A', 'A', []),
            node('NODE_1', 'B', ['C100T', 'A200-'], [node('B', 'B', []), node('B.1', 'B.1', ['G300A'], [])]),
        ],
    ),
    'lineage',
);

describe('lineageSignatures', () => {
    it('takes all the substitutions down from the root, in panel order', () => {
        expect(lineageSignatures(lineageTree, ['B.1', 'B']).signatures).toEqual({
            'B.1': ['C100T', 'G300A'],
            B: ['C100T'],
        });
    });

    it('lists the lineages that are not in the tree', () => {
        expect(lineageSignatures(lineageTree, ['B', 'XYZ'])).toEqual({
            signatures: { B: ['C100T'] },
            missing: ['XYZ'],
        });
    });
});

describe('nucleotideSubstitutions', () => {
    it('leaves out deletions and ambiguous codes', () => {
        expect(nucleotideSubstitutions(['C241T', 'A11288-', 'G123N', 'T670G'])).toEqual(['C241T', 'T670G']);
    });
});
