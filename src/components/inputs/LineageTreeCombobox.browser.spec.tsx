import { describe, expect, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { LineageTreeCombobox, sortedLineageNames } from './LineageTreeCombobox';
import { it } from '../../../test-extend';
import { buildLineageTree } from '../../lineageTree/lineageTree';
import { type NextcladeTreeNode } from '../../lineageTree/nextcladeTree';

/* eslint-disable @typescript-eslint/naming-convention -- the field names of the Auspice JSON format */

function node(lineage: string, children: NextcladeTreeNode[] = []): NextcladeTreeNode {
    return { name: `NODE_${lineage}`, node_attrs: { lineage: { value: lineage } }, children };
}

const lineageTree = buildLineageTree(
    node('A', [node('A.1', [node('A.1.1')]), node('A.10'), node('A.2'), node('B')]),
    'lineage',
);

describe('sortedLineageNames', () => {
    it('sorts the lineages with numbers in their names in numeric order', () => {
        expect(sortedLineageNames(lineageTree)).toEqual(['A', 'A.1', 'A.1.1', 'A.2', 'A.10', 'B']);
    });
});

describe('LineageTreeCombobox', () => {
    it('lists the lineages of the tree, without wildcards', async () => {
        const screen = render(<LineageTreeCombobox lineageTree={lineageTree} value={undefined} onChange={vi.fn()} />);

        await screen.getByRole('combobox').click();

        await expect.element(screen.getByText('A.1.1', { exact: true })).toBeInTheDocument();
        expect(screen.getByRole('option').all()).toHaveLength(6);
        expect(screen.getByText('A*').query()).toBeNull();
    });

    it('calls onChange with the picked lineage', async () => {
        const onChange = vi.fn();
        const screen = render(<LineageTreeCombobox lineageTree={lineageTree} value={undefined} onChange={onChange} />);

        await screen.getByRole('combobox').fill('A.1');
        await screen.getByText('A.1.1', { exact: true }).click();

        expect(onChange).toHaveBeenLastCalledWith('A.1.1');
    });

    it('shows the selected lineage', async () => {
        const screen = render(<LineageTreeCombobox lineageTree={lineageTree} value='A.2' onChange={vi.fn()} />);

        await expect.element(screen.getByRole('combobox')).toHaveValue('A.2');
    });

    it('shows nothing selected for a lineage that is not in the tree', async () => {
        const screen = render(<LineageTreeCombobox lineageTree={lineageTree} value='Z.1' onChange={vi.fn()} />);

        await expect.element(screen.getByRole('combobox')).toHaveValue('');
    });

    it('calls onChange with undefined when the input is cleared', async () => {
        const onChange = vi.fn();
        const screen = render(<LineageTreeCombobox lineageTree={lineageTree} value='A.2' onChange={onChange} />);

        await screen.getByRole('combobox').fill('');
        await userEvent.tab();

        expect(onChange).toHaveBeenLastCalledWith(undefined);
    });

    describe('with multiSelect', () => {
        it('shows the selected lineages that are in the tree', async () => {
            const screen = render(
                <LineageTreeCombobox
                    lineageTree={lineageTree}
                    multiSelect={true}
                    value={['A.1', 'Z.1', 'B']}
                    onChange={vi.fn()}
                />,
            );

            await expect.element(screen.getByText('A.1', { exact: true })).toBeInTheDocument();
            await expect.element(screen.getByText('B', { exact: true })).toBeInTheDocument();
            expect(screen.getByText('Z.1').query()).toBeNull();
        });

        it('calls onChange with the picked lineages', async () => {
            const onChange = vi.fn();
            const screen = render(
                <LineageTreeCombobox
                    lineageTree={lineageTree}
                    multiSelect={true}
                    value={['A.1']}
                    onChange={onChange}
                />,
            );

            await screen.getByRole('combobox').fill('A.1');
            await screen.getByText('A.1.1', { exact: true }).click();

            expect(onChange).toHaveBeenLastCalledWith(['A.1', 'A.1.1']);
        });
    });
});
