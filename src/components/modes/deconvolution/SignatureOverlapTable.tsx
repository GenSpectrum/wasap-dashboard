import { useMemo } from 'react';

import { signatureOverlap } from './signatureOverlap';
import { HoverTooltip } from '../../ui/HoverTooltip';

/**
 * The overlap of the signatures of the lineages of a panel, as a matrix: each cell has the number
 * of mutations two lineages share, shaded by their Jaccard index (shared / union); the diagonal
 * has the size of the signature. The last column has the mutations only that lineage has.
 */
export function SignatureOverlapTable({
    signatures,
    colors,
}: {
    signatures: Record<string, readonly string[]>;
    colors: Map<string, string>;
}) {
    const overlap = useMemo(() => signatureOverlap(signatures), [signatures]);
    const { lineages, sizes, unique, shared, jaccard } = overlap;

    return (
        <div className='flex flex-col gap-3'>
            <table className='text-sm'>
                <thead>
                    <tr>
                        <th />
                        {lineages.map((lineage) => (
                            <th key={lineage} className='px-1 pb-1 align-bottom font-medium'>
                                <span className='inline-block rotate-180 whitespace-nowrap [writing-mode:vertical-rl]'>
                                    {lineage}
                                </span>
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
                            {lineages.map((column, j) =>
                                i === j ? (
                                    <td key={column} className='p-0.5'>
                                        <HoverTooltip
                                            focusable
                                            className='flex h-8 min-w-10 items-center justify-center bg-stone-100 text-gray-500'
                                            content={`${row}: ${sizes[i]} substitutions`}
                                        >
                                            {sizes[i]}
                                        </HoverTooltip>
                                    </td>
                                ) : (
                                    <td key={column} className='p-0.5'>
                                        <HoverTooltip
                                            focusable
                                            className='flex h-8 min-w-10 items-center justify-center tabular-nums'
                                            content={
                                                <PairDetails
                                                    a={row}
                                                    b={column}
                                                    shared={shared[i][j]}
                                                    onlyA={sizes[i] - shared[i][j]}
                                                    onlyB={sizes[j] - shared[i][j]}
                                                    jaccard={jaccard[i][j]}
                                                />
                                            }
                                        >
                                            <span
                                                className='flex h-full w-full items-center justify-center'
                                                style={cellStyle(jaccard[i][j])}
                                            >
                                                {shared[i][j]}
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
                                            <div className='max-w-96 text-xs'>
                                                <p className='mb-1 font-medium'>Only in {row}:</p>
                                                <p className='font-mono'>{unique[i].join(' ')}</p>
                                            </div>
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
    jaccard,
}: {
    a: string;
    b: string;
    shared: number;
    onlyA: number;
    onlyB: number;
    jaccard: number;
}) {
    return (
        <dl className='grid grid-cols-[auto_auto] gap-x-3 text-sm'>
            <dt>Shared</dt>
            <dd className='text-right tabular-nums'>{shared}</dd>
            <dt>Only in {a}</dt>
            <dd className='text-right tabular-nums'>{onlyA}</dd>
            <dt>Only in {b}</dt>
            <dd className='text-right tabular-nums'>{onlyB}</dd>
            <dt>Jaccard index</dt>
            <dd className='text-right tabular-nums'>{jaccard.toFixed(2)}</dd>
        </dl>
    );
}

/** Darker for more overlap, so that the pairs that are hard to tell apart stand out. */
function cellStyle(jaccard: number) {
    return {
        backgroundColor: `rgba(42, 120, 214, ${(0.08 + 0.85 * jaccard).toFixed(3)})`,
        color: jaccard > 0.55 ? 'white' : undefined,
    };
}

function Legend() {
    const steps = [0, 0.25, 0.5, 0.75, 1];
    return (
        <div className='flex items-center gap-2 text-xs text-gray-600'>
            <span>Jaccard index</span>
            {steps.map((step) => (
                <span key={step} className='flex items-center gap-1'>
                    <span className='inline-block h-3 w-5' style={cellStyle(step)} />
                    {step}
                </span>
            ))}
        </div>
    );
}
