import { useMemo, type ReactNode } from 'react';
import { Link, type To } from 'react-router-dom';

import { HoverTooltip } from './hover-tooltip';
import { type LineageTree } from '../../lineageTree/lineageTree';
import { buildPanelTree, type PanelTreeNode } from '../../lineageTree/panelTree';

/**
 * How the lineages of a panel hang together in the lineage tree. Of the lineages that aren't in
 * the panel, it shows (greyed out) only the common ancestors where the panel branches apart and
 * the lineages on the way that start a clade; a dashed line and "via N" mark where others are left
 * out. Recombinants get a section of their own, a tree per recombinant with the lineages it's a
 * recombinant of. Hovering a lineage shows its immediate parents and when it was designated,
 * clicking it goes to `lineageLink` of the lineage, if there is one.
 */
export function LineagePanelTree({
    lineageTree,
    panel,
    colors,
    lineageLink,
}: {
    lineageTree: LineageTree;
    panel: string[];
    /** The colour of each lineage, to match the other plots of the page. */
    colors: Map<string, string>;
    /** Where the name of a lineage links to. */
    lineageLink?: (lineage: string) => To;
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
                        <Nodes nodes={panelTree.lineages} colors={colors} lineageLink={lineageLink} />
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
                                    <Nodes nodes={[recombinant]} colors={colors} lineageLink={lineageLink} />
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
    lineageLink,
    nested = false,
}: {
    nodes: PanelTreeNode[];
    colors: Map<string, string>;
    lineageLink: ((lineage: string) => To) | undefined;
    nested?: boolean;
}) {
    return (
        <ul>
            {nodes.map((node) => (
                <li
                    key={node.name}
                    className={nested ? `${CONNECTOR} ${node.skipped.length > 0 ? 'before:border-dashed' : ''}` : ''}
                >
                    {/* Shown on hover (or focus, on the link), so it never makes the page longer. */}
                    <HoverTooltip content={<NodeInfo node={node} />} placement='right' className='w-max'>
                        <NodeLabel node={node} color={colors.get(node.name)} to={lineageLink?.(node.name)} />
                    </HoverTooltip>
                    {node.children.length > 0 && (
                        <Nodes nodes={node.children} colors={colors} lineageLink={lineageLink} nested />
                    )}
                </li>
            ))}
        </ul>
    );
}

function NodeLabel({ node, color, to }: { node: PanelTreeNode; color: string | undefined; to: To | undefined }) {
    const nameClassName = node.inPanel ? 'font-medium' : 'text-gray-500';
    return (
        <div className='flex h-7 items-center gap-2 text-sm'>
            <span
                className={`inline-block size-2.5 shrink-0 rounded-full border-2 ${node.inPanel ? '' : 'border-stone-400 bg-white'}`}
                style={node.inPanel ? { backgroundColor: color, borderColor: color } : undefined}
            />
            {to === undefined ? (
                <span className={nameClassName}>{node.name}</span>
            ) : (
                <Link to={to} className={`link link-hover ${nameClassName}`}>
                    {node.name}
                </Link>
            )}
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
