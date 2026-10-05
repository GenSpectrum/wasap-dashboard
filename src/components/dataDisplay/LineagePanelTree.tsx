import { flip, offset, shift } from '@floating-ui/dom';
import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';

import { useFloatingUi } from './floating-ui-hooks';
import { TOOLTIP_BASE_STYLES } from './tooltip';
import { type LineageTree } from '../../lineageTree/lineageTree';
import { buildPanelTree, type PanelTreeNode } from '../../lineageTree/panelTree';

/**
 * How the lineages of a panel hang together in the lineage tree. Of the lineages that aren't in
 * the panel, it shows (greyed out) only the common ancestors where the panel branches apart and
 * the lineages on the way that start a clade; a dashed line and "via N" mark where others are left
 * out. Recombinants get a section of their own, a tree per recombinant with the lineages it's a
 * recombinant of. Hovering a lineage shows its immediate parents and when it was designated.
 */
export function LineagePanelTree({
    lineageTree,
    panel,
    colors,
}: {
    lineageTree: LineageTree;
    panel: string[];
    /** The colour of each lineage, to match the other plots of the page. */
    colors: Map<string, string>;
}) {
    const panelTree = useMemo(() => buildPanelTree(lineageTree, panel), [lineageTree, panel]);
    const inPanel = new Set(panel);

    return (
        <div className='flex flex-col gap-4'>
            <div className='grid gap-6 md:grid-cols-2'>
                <TreeSection title='Lineages'>
                    {panelTree.lineages.length === 0 ? (
                        <Empty>No lineages outside the recombinants.</Empty>
                    ) : (
                        <Nodes nodes={panelTree.lineages} colors={colors} />
                    )}
                </TreeSection>
                <TreeSection title='Recombinants'>
                    {panelTree.recombinants.length === 0 ? (
                        <Empty>No recombinants or their sublineages.</Empty>
                    ) : (
                        <div className='flex flex-col gap-3'>
                            {panelTree.recombinants.map((recombinant) => (
                                <div key={recombinant.name}>
                                    <RecombinantParents parents={recombinant.parents} inPanel={inPanel} />
                                    <Nodes nodes={[recombinant]} colors={colors} />
                                </div>
                            ))}
                        </div>
                    )}
                </TreeSection>
            </div>
            {panelTree.missing.length > 0 && (
                <p className='text-sm text-gray-600'>Not in the lineage tree: {panelTree.missing.join(', ')}</p>
            )}
        </div>
    );
}

function TreeSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div>
            <h3 className='mb-1 text-sm font-semibold text-gray-700'>{title}</h3>
            {children}
        </div>
    );
}

function Empty({ children }: { children: ReactNode }) {
    return <p className='text-sm text-gray-500'>{children}</p>;
}

/** The lineages a recombinant is a recombinant of, those in the panel in bold. */
function RecombinantParents({ parents, inPanel }: { parents: string[]; inPanel: Set<string> }) {
    return (
        <p className='text-xs text-gray-500'>
            {parents.length === 0
                ? 'Parents unknown'
                : parents.map((parent, i) => (
                      <span key={parent}>
                          {i > 0 && ' × '}
                          <span className={inPanel.has(parent) ? 'font-semibold text-gray-800' : ''}>{parent}</span>
                      </span>
                  ))}
        </p>
    );
}

/** The connector from the node above: an elbow into the row, and a line on to the next sibling. */
const CONNECTOR =
    'relative pl-5 before:absolute before:top-0 before:left-1.5 before:h-3.5 before:w-3 before:border-b before:border-l before:border-stone-400 not-last:after:absolute not-last:after:top-0 not-last:after:bottom-0 not-last:after:left-1.5 not-last:after:border-l not-last:after:border-stone-400';

function Nodes({
    nodes,
    colors,
    nested = false,
}: {
    nodes: PanelTreeNode[];
    colors: Map<string, string>;
    nested?: boolean;
}) {
    return (
        <ul>
            {nodes.map((node) => (
                <li
                    key={node.name}
                    className={nested ? `${CONNECTOR} ${node.skipped.length > 0 ? 'before:border-dashed' : ''}` : ''}
                >
                    <NodeTooltip node={node}>
                        <NodeLabel node={node} color={colors.get(node.name)} />
                    </NodeTooltip>
                    {node.children.length > 0 && <Nodes nodes={node.children} colors={colors} nested />}
                </li>
            ))}
        </ul>
    );
}

/**
 * Shows the info of the lineage next to its label on hover. It's only rendered while shown, and
 * moved back into view at the edge of the window, so that it never makes the page longer.
 */
function NodeTooltip({ node, children }: { node: PanelTreeNode; children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const referenceRef = useRef<HTMLDivElement>(null);
    return (
        <div
            ref={referenceRef}
            className='w-max'
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            {children}
            {isOpen && <FloatingNodeInfo node={node} referenceRef={referenceRef} />}
        </div>
    );
}

const TOOLTIP_MIDDLEWARE = [offset(4), flip(), shift({ padding: 8 })];

function FloatingNodeInfo({
    node,
    referenceRef,
}: {
    node: PanelTreeNode;
    referenceRef: RefObject<HTMLElement | null>;
}) {
    const floatingRef = useRef<HTMLDivElement>(null);
    useFloatingUi(referenceRef, floatingRef, TOOLTIP_MIDDLEWARE, 'right');
    return (
        <div ref={floatingRef} className={`absolute top-0 left-0 ${TOOLTIP_BASE_STYLES}`}>
            <NodeInfo node={node} />
        </div>
    );
}

function NodeLabel({ node, color }: { node: PanelTreeNode; color: string | undefined }) {
    return (
        <div className='flex h-7 items-center gap-2 text-sm'>
            <span
                className={`inline-block size-2.5 shrink-0 rounded-full border-2 ${node.inPanel ? '' : 'border-stone-400 bg-white'}`}
                style={node.inPanel ? { backgroundColor: color, borderColor: color } : undefined}
            />
            <span className={node.inPanel ? 'font-medium' : 'text-gray-500'}>{node.name}</span>
            {node.clade !== undefined && (
                <span className='rounded bg-stone-100 px-1 text-xs text-gray-600'>{node.clade}</span>
            )}
            {node.skipped.length > 0 && <span className='text-xs text-gray-500'>via {node.skipped.length}</span>}
        </div>
    );
}

function NodeInfo({ node }: { node: PanelTreeNode }) {
    return (
        <div className='flex flex-col gap-1 text-sm'>
            <div className='font-semibold'>{node.name}</div>
            <div>
                {node.recombinant ? 'Recombinant of' : 'Parent'}:{' '}
                {node.parents.length === 0 ? 'none' : node.parents.join(node.recombinant ? ' × ' : ', ')}
            </div>
            <div>Designated: {node.designationDate ?? 'unknown'}</div>
            {node.clade !== undefined && <div>Starts clade {node.clade}</div>}
            {node.skipped.length > 0 && (
                <div className='text-gray-600'>Left out in between: {node.skipped.join(' → ')}</div>
            )}
            {!node.inPanel && <div className='text-gray-600'>Not in the panel</div>}
        </div>
    );
}
