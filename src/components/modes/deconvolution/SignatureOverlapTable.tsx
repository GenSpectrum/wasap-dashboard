import { useMemo } from 'react';

import { signatureOverlap } from './signatureOverlap';
import { HoverTooltip } from '../../ui/HoverTooltip';

/**
 * The overlap of the signatures of the lineages of a panel, as a matrix: each cell has the number
 * of mutations that tell two lineages apart (those only one of the two has). The first column has the size of the signature, the last one the
 * mutations only that lineage of the panel has.
 */
export function SignatureOverlapTable({
    signatures,
    colors,
}: {
    signatures: Record<string, readonly string[]>;
    colors: Map<string, string>;
}) {
    const overlap = useMemo(() => signatureOverlap(signatures), [signatures]);
    const { lineages, sizes, unique, shared, distinguishing } = overlap;

    return (
        <div className='flex flex-col gap-3'>
            <table className='self-start text-sm'>
                <thead>
                    <tr>
                        <th />
                        <th className='px-2 pb-1 text-right align-bottom font-medium'>Signature</th>
                        {lineages.map((lineage) => (
                            <th key={lineage} className='px-1 pb-1 align-bottom font-medium whitespace-nowrap'>
                                {lineage}
                            </th>
                        ))}
                        <th className='px-2 pb-1 text-left align-bottom font-medium'>Unique</th>
                    </tr>
                </thead>
                <tbody>
                    {lineages.map((row, i) => (
                        <tr key={row}>
                            <th className='pr-2 text-left font-medium whitespace-nowrap'>
                                <LineageName lineage={row} color={colors.get(row)} />
                            </th>
                            <td className='px-2 text-right tabular-nums'>{sizes[i]}</td>
                            {lineages.map((column, j) =>
                                i === j ? (
                                    <td key={column} className='p-px' />
                                ) : (
                                    <td key={column} className='p-px'>
                                        <HoverTooltip
                                            focusable
                                            className='flex h-7 min-w-12 items-center justify-center tabular-nums'
                                            content={
                                                <PairDetails
                                                    a={row}
                                                    b={column}
                                                    shared={shared[i][j]}
                                                    onlyA={sizes[i] - shared[i][j]}
                                                    onlyB={sizes[j] - shared[i][j]}
                                                />
                                            }
                                        >
                                            <span
                                                className='flex h-full w-full items-center justify-center'
                                                style={cellStyle(distinguishing[i][j])}
                                            >
                                                {distinguishing[i][j]}
                                            </span>
                                        </HoverTooltip>
                                    </td>
                                ),
                            )}
                            <td className='px-2'>
                                <HoverTooltip
                                    focusable
                                    className='tabular-nums'
                                    content={
                                        unique[i].length === 0 ? (
                                            `Every mutation of ${row} is also in another lineage of the panel.`
                                        ) : (
                                            <MutationList title={`Only in ${row}:`} mutations={unique[i]} />
                                        )
                                    }
                                >
                                    {unique[i].length}
                                </HoverTooltip>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <Legend />
        </div>
    );
}

function MutationList({ title, mutations }: { title: string; mutations: string[] }) {
    return (
        <div className='max-w-96 text-xs'>
            <p className='mb-1 font-medium'>{title}</p>
            <p className='font-mono'>{mutations.length === 0 ? 'none' : mutations.join(' ')}</p>
        </div>
    );
}

function LineageName({ lineage, color }: { lineage: string; color: string | undefined }) {
    return (
        <span className='flex items-center gap-1.5'>
            <span className='inline-block h-2.5 w-2.5 rounded-full' style={{ backgroundColor: color }} />
            {lineage}
        </span>
    );
}

function PairDetails({
    a,
    b,
    shared,
    onlyA,
    onlyB,
}: {
    a: string;
    b: string;
    shared: number;
    onlyA: number;
    onlyB: number;
}) {
    return (
        <dl className='grid grid-cols-[auto_auto] gap-x-3 text-sm'>
            <dt>Shared</dt>
            <dd className='text-right tabular-nums'>{shared}</dd>
            <dt>Only in {a}</dt>
            <dd className='text-right tabular-nums'>{onlyA}</dd>
            <dt>Only in {b}</dt>
            <dd className='text-right tabular-nums'>{onlyB}</dd>
            <dt>Distinguishing</dt>
            <dd className='text-right tabular-nums'>{onlyA + onlyB}</dd>
        </dl>
    );
}

/**
 * Steps of the number of distinguishing mutations and their colours: red to orange up to 10, where
 * the deconvolution has little to split the shares of two lineages on, yellow up to 20, green above.
 */
const DISTINGUISHING_STEPS = [
    { upTo: 1, label: '≤ 1', color: '#e57373', text: undefined },
    { upTo: 3, label: '2–3', color: '#ef8f6b', text: undefined },
    { upTo: 5, label: '4–5', color: '#f5ab66', text: undefined },
    { upTo: 10, label: '6–10', color: '#f9c983', text: undefined },
    { upTo: 20, label: '11–20', color: '#fbe39c', text: undefined },
    { upTo: Infinity, label: '> 20', color: '#b9dfa8', text: undefined },
];

/** In steps rather than a smooth scale, so that cells are easy to compare. */
function cellStyle(distinguishing: number) {
    const step = DISTINGUISHING_STEPS.find(({ upTo }) => distinguishing <= upTo) ?? DISTINGUISHING_STEPS[0];
    return { backgroundColor: step.color, color: step.text };
}

function Legend() {
    return (
        <div className='flex flex-wrap items-center gap-2 text-xs text-gray-600'>
            <span>Distinguishing substitutions</span>
            {DISTINGUISHING_STEPS.map(({ label, color }) => (
                <span key={label} className='flex items-center gap-1'>
                    <span className='inline-block h-3 w-5' style={{ backgroundColor: color }} />
                    {label}
                </span>
            ))}
        </div>
    );
}
