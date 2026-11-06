import { useMemo } from 'react';

import { signatureOverlap } from './signatureOverlap';
import { HoverTooltip } from '../../ui/HoverTooltip';

/**
 * The overlap of the signatures of the lineages of a panel. First the number of mutations all of
 * them share, then, without those, a matrix: each cell has the Jaccard index of two lineages
 * (shared / union) and the number of mutations that tell them apart (those only one of the two
 * has, so the matrix is symmetric); the diagonal has the size of the
 * signature. The last column has the mutations only that lineage has.
 */
export function SignatureOverlapTable({
    signatures,
    colors,
}: {
    signatures: Record<string, readonly string[]>;
    colors: Map<string, string>;
}) {
    const overlap = useMemo(() => signatureOverlap(signatures), [signatures]);
    const { lineages, common, sizes, unique, shared, jaccard } = overlap;

    return (
        <div className='flex flex-col gap-3'>
            <p className='text-sm'>
                <HoverTooltip
                    focusable
                    className='inline font-semibold tabular-nums underline decoration-dotted underline-offset-2'
                    content={<MutationList title='Common to all lineages of the panel:' mutations={common} />}
                >
                    {common.length}
                </HoverTooltip>{' '}
                {common.length === 1 ? 'substitution is' : 'substitutions are'} common to all lineages of the panel; the
                table leaves {common.length === 1 ? 'it' : 'them'} out.
            </p>
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
                                            className='flex h-10 min-w-14 items-center justify-center bg-stone-100 text-gray-500 tabular-nums'
                                            content={`${row}: ${sizes[i]} substitutions`}
                                        >
                                            {sizes[i]}
                                        </HoverTooltip>
                                    </td>
                                ) : (
                                    <td key={column} className='p-0.5'>
                                        <HoverTooltip
                                            focusable
                                            className='flex h-10 min-w-14 items-center justify-center tabular-nums'
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
                                                className='flex h-full w-full flex-col items-center justify-center leading-tight'
                                                style={cellStyle(jaccard[i][j])}
                                            >
                                                <span className='font-medium'>{jaccard[i][j].toFixed(2)}</span>
                                                <span className='text-xs opacity-75'>
                                                    {sizes[i] + sizes[j] - 2 * shared[i][j]}
                                                </span>
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
            <dt>Distinguishing</dt>
            <dd className='text-right tabular-nums'>{onlyA + onlyB}</dd>
            <dt>Jaccard index</dt>
            <dd className='text-right tabular-nums'>{jaccard.toFixed(2)}</dd>
        </dl>
    );
}

/** Steps of the Jaccard index and their colours, darker for more overlap. */
const JACCARD_STEPS = [
    { from: 0, color: '#f1f5fb', text: undefined },
    { from: 0.2, color: '#c9dcf4', text: undefined },
    { from: 0.4, color: '#89b4e8', text: undefined },
    { from: 0.6, color: '#3f82d4', text: 'white' },
    { from: 0.8, color: '#1a4f94', text: 'white' },
];

/** In steps rather than a smooth scale, so that cells are easy to compare. */
function cellStyle(jaccard: number) {
    const step = JACCARD_STEPS.findLast(({ from }) => jaccard >= from) ?? JACCARD_STEPS[0];
    return { backgroundColor: step.color, color: step.text };
}

function Legend() {
    return (
        <div className='flex flex-wrap items-center gap-2 text-xs text-gray-600'>
            <span>Jaccard index (top), distinguishing substitutions (bottom)</span>
            {JACCARD_STEPS.map(({ from, color }, index) => (
                <span key={from} className='flex items-center gap-1'>
                    <span className='inline-block h-3 w-5' style={{ backgroundColor: color }} />
                    {index === JACCARD_STEPS.length - 1 ? `≥ ${from}` : `${from}–${JACCARD_STEPS[index + 1].from}`}
                </span>
            ))}
        </div>
    );
}
