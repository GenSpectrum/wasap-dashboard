import { describe, expect } from 'vitest';
import { render } from 'vitest-browser-react';

import { LineagePanelTree } from './LineagePanelTree';
import { it } from '../../../test-extend';
import { buildLineageTree } from '../../lineageTree/lineageTree';
import { type NextcladeTreeNode } from '../../lineageTree/nextcladeTree';

/* eslint-disable @typescript-eslint/naming-convention -- the field names of the Auspice JSON format */

function lineage(name: string, children: NextcladeTreeNode[] = [], designationDate?: string): NextcladeTreeNode {
    return {
        name: `NODE_${name}`,
        node_attrs: { lineage: { value: name } },
        children: [
            {
                name,
                node_attrs: {
                    lineage: { value: name },
                    designation_date: designationDate === undefined ? undefined : { value: designationDate },
                },
            },
            ...children,
        ],
    };
}

const lineageTree = buildLineageTree(
    lineage('A', [
        lineage('A.1', [lineage('A.1.1', [lineage('A.1.1.1')], '2020-03-01')], '2020-02-01'),
        lineage('A.2'),
        lineage('X', [lineage('X.1')], '2021-01-01'),
    ]),
    'lineage',
    new Map([['X', ['A.1', 'A.2']]]),
);

describe('LineagePanelTree', () => {
    it('shows a lineage with its parent and designation date on hover', async () => {
        const { getByText } = render(
            <LineagePanelTree lineageTree={lineageTree} panel={['A.1', 'A.1.1.1']} colors={new Map()} />,
        );

        await getByText('A.1.1.1', { exact: true }).hover();

        await expect.element(getByText('Parent: A.1.1')).toBeVisible();
        await expect.element(getByText('Designated: unknown')).toBeVisible();
        await expect.element(getByText('Left out in between: A.1.1')).toBeVisible();
        await expect.element(getByText('via 1')).toBeVisible();
    });

    it('shows recombinants in their own section, with their parents', async () => {
        const { getByText } = render(
            <LineagePanelTree lineageTree={lineageTree} panel={['A.1', 'X.1']} colors={new Map()} />,
        );

        await expect.element(getByText('No recombinants or their sublineages.')).not.toBeInTheDocument();
        await getByText('X', { exact: true }).hover();

        await expect.element(getByText('Recombinant of: A.1 × A.2')).toBeVisible();
        await expect.element(getByText('Designated: 2021-01-01')).toBeVisible();
        await expect.element(getByText('Not in the panel', { exact: true })).toBeVisible();
    });

    it('lists the lineages of the panel that are not in the tree', async () => {
        const { getByText } = render(
            <LineagePanelTree lineageTree={lineageTree} panel={['A.1', 'Q.1']} colors={new Map()} />,
        );

        await expect.element(getByText('Not in the lineage tree: Q.1')).toBeVisible();
    });
});
