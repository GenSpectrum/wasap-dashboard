import { describe, expect, it } from 'vitest';

import { lineagePanelSymbols, matchingPanelLineages } from './lineagePanelMatch';
import { buildLineageTree } from './lineageTree';
import { type NextcladeTreeNode } from './nextcladeTree';

/* eslint-disable @typescript-eslint/naming-convention -- the field names of the Auspice JSON format */

function node(
    name: string,
    lineage: string,
    mutations: Record<string, string[]>,
    children: NextcladeTreeNode[] = [],
): NextcladeTreeNode {
    return { name, node_attrs: { lineage: { value: lineage } }, branch_attrs: { mutations }, children };
}

const tree = node('NODE_0', 'A', {}, [
    node('A', 'A', {}),
    node('A.1', 'A.1', { nuc: ['C241T', 'A23403G'], S: ['D614G'] }),
]);
const lineageTree = buildLineageTree(tree, 'lineage');

describe('lineagePanelSymbols', () => {
    it('matches nucleotide positions by bare position label', () => {
        const symbols = lineagePanelSymbols(
            lineageTree,
            ['A.1'],
            ['241', '23403'],
            { '241': 'C', '23403': 'A' },
            'nucleotide',
        );

        expect(symbols.get('A.1')).toEqual({ '241': 'T', '23403': 'G' });
    });

    it('matches amino acid positions by gene:codon label', () => {
        const symbols = lineagePanelSymbols(lineageTree, ['A.1'], ['S:614'], { 'S:614': 'D' }, 'amino acid');

        expect(symbols.get('A.1')).toEqual({ 'S:614': 'G' });
    });

    it('falls back to the reference symbol where the lineage has no mutation', () => {
        const symbols = lineagePanelSymbols(lineageTree, ['A'], ['S:614'], { 'S:614': 'D' }, 'amino acid');

        expect(symbols.get('A')).toEqual({ 'S:614': 'D' });
    });

    it('skips an unknown panel lineage', () => {
        const symbols = lineagePanelSymbols(lineageTree, ['B.1'], ['S:614'], { 'S:614': 'D' }, 'amino acid');

        expect(symbols.size).toBe(0);
    });
});

describe('matchingPanelLineages', () => {
    it('finds the amino acid pattern matching a panel lineage', () => {
        const panelSymbols = lineagePanelSymbols(lineageTree, ['A', 'A.1'], ['S:614'], { 'S:614': 'D' }, 'amino acid');

        expect(matchingPanelLineages(panelSymbols, ['S:614'], { 'S:614': 'G' })).toEqual(['A.1']);
        expect(matchingPanelLineages(panelSymbols, ['S:614'], { 'S:614': 'D' })).toEqual(['A']);
    });
});
