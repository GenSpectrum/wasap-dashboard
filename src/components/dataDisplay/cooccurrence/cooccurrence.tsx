import { Fragment, type FC, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, type To } from 'react-router-dom';

import { formatSymbol, type CooccurrenceOverTimeDataMap, type CooccurrencePattern } from './CooccurrenceOverTimeData';
import { useAmpliconAnchor, labelFor, selectDiversePositions } from '../../../dataLayer/hooks/ampliconPositions';
import { useSiloSchema } from '../../../dataLayer/hooks/connection';
import {
    cooccurrenceTargets,
    filterCooccurrenceByMinShare,
    useCooccurrence,
} from '../../../dataLayer/hooks/cooccurrence';
import { lineagePanelSymbols, matchingPanelLineages } from '../../../dataLayer/hooks/lineagePanelMatch';
import { type SiloReadFilter } from '../../../dataLayer/queries/filter';
import { type PositionTarget } from '../../../dataLayer/queries/mutationsOverTime';
import { type LineageTree } from '../../../lineageTree/lineageTree';
import { type SequenceType, type TemporalGranularity } from '../../../types/dashboardComponents';
import { SubstitutionClass, type Substitution } from '../../../util/mutations';
import { parsePositionToken } from '../../../util/parsePositionToken';
import { useMutationLinkProvider } from '../../MutationLinkTemplateContext';
import { ErrorBoundary } from '../../shared/error-boundary';
import { LoadingDisplay } from '../../shared/loading-display';
import { NoDataDisplay } from '../../shared/no-data-display';
import { CsvDownloadButton } from '../csv-download-button';
import { Pagination } from '../pagination';

type CooccurrenceBaseProps = {
    filter: SiloReadFilter;
    sequenceType: SequenceType;
    granularity: TemporalGranularity;
    /** Only patterns on at least this share of the reads over the time range are shown. */
    minShare: number;
    pageSizes: number[];
    /** EXPERIMENTAL: a panel of lineages to match co-occurrence patterns against; see `lineagePanelMatch`. */
    panel?: string[];
    lineageTree?: LineageTree;
    /** Opens a row's mutations in the manual mode, when it is enabled. */
    manualModeLink?: (mutations: string[]) => To;
    /** Opens a panel-match lineage in the variant explorer, when it is enabled. */
    variantModeLink?: (lineage: string) => To;
};

export type CooccurrenceProps =
    | (CooccurrenceBaseProps & {
          positionSource: 'manual';
          /** Position tokens as typed by the user, e.g. `501` (nucleotide) or `S:501` (amino acid). */
          positions: string[];
      })
    | (CooccurrenceBaseProps & {
          positionSource: 'amplicon';
          /** A single position token whose amplicon is scanned for co-occurrence-worthy positions. */
          anchorPosition: string;
          /** Positions at or below this Shannon entropy (bits) are left out. */
          entropyCutoff: number;
      });

export const Cooccurrence: FC<CooccurrenceProps> = (props) => {
    const { filter, sequenceType, granularity } = props;
    return (
        <ErrorBoundary resetKeys={[filter, sequenceType, granularity, props]}>
            {props.positionSource === 'amplicon' ? (
                <AmpliconCooccurrenceInner {...props} />
            ) : (
                <ManualCooccurrenceInner {...props} />
            )}
        </ErrorBoundary>
    );
};

type ManualCooccurrenceProps = Extract<CooccurrenceProps, { positionSource: 'manual' }>;
type AmpliconCooccurrenceProps = Extract<CooccurrenceProps, { positionSource: 'amplicon' }>;

const ManualCooccurrenceInner: FC<ManualCooccurrenceProps> = (componentProps) => {
    const { sequenceType, positions } = componentProps;
    const { nucleotideSequence } = useSiloSchema();

    const { targets, labels } = useMemo(() => {
        const tokens = positions.map((raw) => parsePositionToken(raw, sequenceType)).filter((token) => token !== null);
        return cooccurrenceTargets(tokens, sequenceType, nucleotideSequence);
    }, [positions, sequenceType, nucleotideSequence]);

    return <CooccurrenceFromTargets componentProps={componentProps} targets={targets} labels={labels} />;
};

/**
 * Resolves a single anchor position to the positions to run co-occurrence
 * over: the amplicon containing it, filtered to positions above the entropy
 * cutoff — see `useAmpliconAnchor` for the two-query technique.
 */
const AmpliconCooccurrenceInner: FC<AmpliconCooccurrenceProps> = ({ panel, lineageTree, ...componentProps }) => {
    const { filter, sequenceType, anchorPosition, entropyCutoff } = componentProps;
    const { nucleotideSequence } = useSiloSchema();

    const anchorToken = useMemo(() => parsePositionToken(anchorPosition, sequenceType), [anchorPosition, sequenceType]);
    const anchorTarget: PositionTarget | null = useMemo(() => {
        if (anchorToken === null) {
            return null;
        }
        const sequenceName = sequenceType === 'nucleotide' ? nucleotideSequence : (anchorToken.segment ?? '');
        return sequenceName === '' ? null : { sequenceName, position: anchorToken.position };
    }, [anchorToken, sequenceType, nucleotideSequence]);

    const { amplicon, positionsByEntropy, isLoading, error } = useAmpliconAnchor(filter, sequenceType, anchorTarget);

    if (anchorTarget === null) {
        return <NoDataDisplay />;
    }
    if (isLoading) {
        return <LoadingDisplay />;
    }
    if (error) {
        throw error;
    }
    if (amplicon === null) {
        return <NoDataDisplay />;
    }

    const diversePositions = selectDiversePositions(positionsByEntropy, entropyCutoff);
    if (diversePositions.length < 2) {
        return (
            <NoDataDisplay
                message={
                    `Amplicon ${amplicon.start.toLocaleString()}–${amplicon.end.toLocaleString()} has fewer than 2 ` +
                    `positions above an entropy cutoff of ${entropyCutoff} bits. Try lowering the cutoff.`
                }
            />
        );
    }

    const targets = diversePositions.map((position) => ({ sequenceName: anchorTarget.sequenceName, position }));
    const labels = diversePositions.map((position) => labelFor(position, sequenceType, anchorToken?.segment));

    // The reference (wild-type) base at each position, from the same amplicon-scan query —
    // already fetched for the entropy calculation, just not surfaced until now.
    const refByPosition = new Map(positionsByEntropy.map((p) => [p.position, p.ref]));
    const referenceSymbols = Object.fromEntries(
        diversePositions.map((position, index) => [labels[index], refByPosition.get(position)]),
    );

    const contextNote = (
        <p className='px-2 pt-2 pb-1 text-sm text-gray-600'>
            Amplicon <span className='font-mono font-medium text-black'>{amplicon.start.toLocaleString()}</span>
            &ndash;<span className='font-mono font-medium text-black'>{amplicon.end.toLocaleString()}</span> (
            {(amplicon.end - amplicon.start + 1).toLocaleString()} {sequenceType === 'nucleotide' ? 'bp' : 'aa'})
            &middot; {diversePositions.length} of {positionsByEntropy.length} positions exceed {entropyCutoff} bits of
            entropy.
        </p>
    );

    return (
        <CooccurrenceFromTargets
            componentProps={componentProps}
            targets={targets}
            labels={labels}
            contextNote={contextNote}
            referenceSymbols={referenceSymbols}
            panel={panel}
            lineageTree={lineageTree}
        />
    );
};

/**
 * The substitution a position's label and observed symbol stand for, to link out to CoV-Spectrum
 * with — `referenceSymbols` (only known for the amplicon-anchor source) gives the reference base;
 * without it the substitution is still well-formed, just missing `valueAtReference`, which
 * `SubstitutionClass` and the clinical LAPIS behind the link tolerate (position + new base alone).
 */
function substitutionFor(
    label: string,
    symbol: string,
    sequenceType: SequenceType,
    referenceSymbols: Record<string, string | undefined> | undefined,
): Substitution | null {
    const token = parsePositionToken(label, sequenceType);
    if (token === null) {
        return null;
    }
    return new SubstitutionClass(token.segment, referenceSymbols?.[label], symbol, token.position);
}

const CooccurrenceFromTargets: FC<{
    componentProps: CooccurrenceProps;
    targets: PositionTarget[];
    labels: string[];
    contextNote?: ReactNode;
    referenceSymbols?: Record<string, string | undefined>;
    panel?: string[];
    lineageTree?: LineageTree;
}> = ({ componentProps, targets, labels, contextNote, referenceSymbols, panel, lineageTree }) => {
    const { filter, sequenceType, granularity } = componentProps;

    const { data, isLoading, error } = useCooccurrence(filter, granularity, sequenceType, targets, labels);

    if (isLoading) {
        return <LoadingDisplay />;
    }

    if (error) {
        throw error;
    }

    if (data === null || data.getFirstAxisKeys().length === 0) {
        return <NoDataDisplay />;
    }

    return (
        <CooccurrenceWithData
            data={data}
            positionLabels={labels}
            originalComponentProps={componentProps}
            contextNote={contextNote}
            referenceSymbols={referenceSymbols}
            panel={panel}
            lineageTree={lineageTree}
        />
    );
};

type CooccurrenceWithDataProps = {
    data: CooccurrenceOverTimeDataMap;
    positionLabels: string[];
    originalComponentProps: CooccurrenceProps;
    referenceSymbols?: Record<string, string | undefined>;
    contextNote?: ReactNode;
    panel?: string[];
    lineageTree?: LineageTree;
};

type PatternShare = { pattern: CooccurrencePattern; count: number; share: number; isReference: boolean };

/**
 * Flattened, not over-time: one row per pattern, its share of all reads across the whole
 * selected time range — the per-date band view got complicated to read once "which lineage is
 * this" became the actual question, so this collapses the date axis entirely instead of trying
 * to fit it in alongside a lineage column.
 */
const CooccurrenceWithData: FC<CooccurrenceWithDataProps> = ({
    data,
    positionLabels,
    originalComponentProps,
    contextNote,
    referenceSymbols,
    panel,
    lineageTree,
}) => {
    const pageSizes = originalComponentProps.pageSizes;
    const sequenceType = originalComponentProps.sequenceType;
    const manualModeLink = originalComponentProps.manualModeLink;
    const variantModeLink = originalComponentProps.variantModeLink;
    const linkProvider = useMutationLinkProvider();
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(pageSizes[0]);

    // Date axis collapsed to a single total per pattern — `hideGaps` (dropping empty date
    // columns) has no effect on a sum, so the mean-proportion filter runs date-column-agnostic.
    const filteredView = useMemo(
        () => filterCooccurrenceByMinShare(data, originalComponentProps.minShare, false),
        [data, originalComponentProps.minShare],
    );

    const patternShares: PatternShare[] = useMemo(() => {
        const dates = filteredView.getSecondAxisKeys();
        // Only patterns with real data at every shown position — a partially-covered
        // combination (some positions "?") isn't a haplotype, it's "we don't have data for
        // part of this read" (e.g. an amplicon longer than what the reads actually span), and
        // mixing it into the ranking crowds out the combinations that are actually resolved.
        const fullyCovered = filteredView
            .getFirstAxisKeys()
            .filter((pattern) => positionLabels.every((label) => pattern.symbols[label] !== null));

        const withCounts = fullyCovered.map((pattern) => {
            let count = 0;
            for (const date of dates) {
                const value = filteredView.get(pattern, date);
                if (value?.type === 'value') {
                    count += value.count;
                }
            }
            return { pattern, count };
        });
        const grandTotal = withCounts.reduce((sum, row) => sum + row.count, 0);
        return withCounts
            .map((row) => ({
                ...row,
                share: grandTotal > 0 ? row.count / grandTotal : 0,
                isReference:
                    referenceSymbols !== undefined &&
                    positionLabels.every(
                        (label) => formatSymbol(row.pattern.symbols[label]) === referenceSymbols[label],
                    ),
            }))
            .sort((a, b) => b.count - a.count);
    }, [filteredView, positionLabels, referenceSymbols]);

    useEffect(() => setPageIndex(0), [patternShares, setPageIndex]);

    // The reference pattern is pinned as its own row instead of taking its turn in the ranking —
    // it's the baseline every other row is read against, not one combination among others.
    const referenceRow = useMemo(() => patternShares.find((row) => row.isReference), [patternShares]);
    const rankedRows = useMemo(() => patternShares.filter((row) => !row.isReference), [patternShares]);

    const totalRows = rankedRows.length;
    const pageRows = useMemo(
        () => rankedRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
        [rankedRows, pageIndex, pageSize],
    );

    // EXPERIMENTAL: which panel lineages explain each pattern, computed straight from the already-
    // loaded lineage tree (no per-row network call, unlike the clinical-LAPIS lookup this replaced) —
    // only possible with a reference symbol per position, i.e. the amplicon-anchor source.
    const panelSymbols = useMemo(() => {
        if (panel === undefined || panel.length === 0 || lineageTree === undefined || referenceSymbols === undefined) {
            return undefined;
        }
        return lineagePanelSymbols(lineageTree, panel, positionLabels, referenceSymbols, sequenceType);
    }, [panel, lineageTree, positionLabels, referenceSymbols, sequenceType]);

    // `getData` is typed to return a Promise so callers can fetch on demand; this data is
    // already in memory, so the wrapper has nothing to await.
    // eslint-disable-next-line @typescript-eslint/require-await
    const getDownloadDataAsync = async (): Promise<Record<string, string | number>[]> =>
        patternShares.map(({ pattern, count, share }) => {
            const row: Record<string, string | number> = {};
            for (const label of positionLabels) {
                row[label] = formatSymbol(pattern.symbols[label]);
            }
            row.reads = count;
            row.share = (share * 100).toFixed(2) + '%';
            return row;
        });

    // Reads, Share, CoV-Spectrum are always there; Panel match and Over time are conditional.
    const extraColumns = 3 + (panelSymbols ? 1 : 0) + (manualModeLink ? 1 : 0);

    const renderRow = (
        rowKey: string,
        patternSymbols: Record<string, string>,
        count: number,
        share: number,
        isReference: boolean,
        pinned: boolean,
    ) => {
        const matches =
            panelSymbols !== undefined
                ? matchingPanelLineages(panelSymbols, positionLabels, patternSymbols)
                : undefined;

        // The row's own mutations — positions whose symbol differs from the reference, or every
        // position if there's no reference to compare to (the manual position source).
        const rowSubstitutions = positionLabels
            .filter((label) => referenceSymbols?.[label] !== patternSymbols[label])
            .map((label) => substitutionFor(label, patternSymbols[label], sequenceType, referenceSymbols))
            .filter((substitution): substitution is Substitution => substitution !== null);
        const combinedLink =
            rowSubstitutions.length > 0
                ? linkProvider({ code: rowSubstitutions.map((s) => s.code).join(',') } as Substitution, sequenceType)
                : undefined;

        return (
            <tr key={rowKey} className={`border-b border-stone-100 ${pinned ? 'bg-stone-100' : ''}`}>
                {positionLabels.map((label) => {
                    const symbol = patternSymbols[label];
                    const isMutated = referenceSymbols !== undefined && symbol !== referenceSymbols[label];
                    // Only link out an actual mutation — a reference base linking to "search for
                    // this non-mutation" is just confusing.
                    const substitution =
                        referenceSymbols === undefined || isMutated
                            ? substitutionFor(label, symbol, sequenceType, referenceSymbols)
                            : null;
                    const link = substitution !== null ? linkProvider(substitution, sequenceType) : undefined;
                    return (
                        <td
                            key={label}
                            className={`px-2 py-1 font-mono whitespace-nowrap ${
                                isMutated ? 'font-semibold text-black' : 'text-gray-400'
                            }`}
                        >
                            {link !== undefined ? (
                                <a
                                    className='hover:text-brand-800 focus:ring-brand-300 underline focus:ring-2 focus:outline-none'
                                    href={link}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                >
                                    {symbol}
                                </a>
                            ) : (
                                symbol
                            )}
                        </td>
                    );
                })}
                <td className='px-2 py-1 text-right font-mono whitespace-nowrap'>{count.toLocaleString()}</td>
                <td className='px-2 py-1 text-right font-mono whitespace-nowrap'>{(share * 100).toFixed(2)}%</td>
                {panelSymbols && (
                    <td className='px-2 py-1 whitespace-nowrap text-gray-700'>
                        {isReference ? (
                            <span className='italic'>Reference</span>
                        ) : matches !== undefined && matches.length > 0 ? (
                            matches.map((lineage, index) => (
                                <Fragment key={lineage}>
                                    {index > 0 && ', '}
                                    {variantModeLink !== undefined ? (
                                        <Link className='link' to={variantModeLink(lineage)}>
                                            {lineage}
                                        </Link>
                                    ) : (
                                        lineage
                                    )}
                                </Fragment>
                            ))
                        ) : (
                            '-'
                        )}
                    </td>
                )}
                <td className='px-2 py-1 whitespace-nowrap'>
                    {combinedLink !== undefined && (
                        <a
                            className='btn btn-xs'
                            href={combinedLink}
                            target='_blank'
                            rel='noopener noreferrer'
                            aria-label='Open this combination on CoV-Spectrum'
                            title='Open this combination on CoV-Spectrum'
                        >
                            <span className='iconify mdi--open-in-new' />
                        </a>
                    )}
                </td>
                {manualModeLink && (
                    <td className='px-2 py-1 whitespace-nowrap'>
                        {rowSubstitutions.length > 0 && (
                            <Link
                                className='btn btn-xs'
                                to={manualModeLink(rowSubstitutions.map((s) => s.code))}
                                aria-label='See these mutations over time in the manual mode'
                                title='See these mutations over time in the manual mode'
                            >
                                <span className='iconify mdi--chart-line' />
                            </Link>
                        )}
                    </td>
                )}
            </tr>
        );
    };

    return (
        <div className='border border-stone-300 bg-white p-2'>
            {contextNote}
            <div className='overflow-auto'>
                <table className='w-full text-sm'>
                    <thead>
                        <tr className='border-b border-stone-300'>
                            {positionLabels.map((label) => (
                                <th key={label} className='px-2 py-1 text-left font-medium whitespace-nowrap'>
                                    {label}
                                </th>
                            ))}
                            <th className='px-2 py-1 text-right font-medium whitespace-nowrap'>Reads</th>
                            <th className='px-2 py-1 text-right font-medium whitespace-nowrap'>Share</th>
                            {panelSymbols && (
                                <th className='px-2 py-1 text-left font-medium whitespace-nowrap'>Panel match</th>
                            )}
                            <th className='px-2 py-1 text-left font-medium whitespace-nowrap'>CoV-Spectrum</th>
                            {manualModeLink && (
                                <th className='px-2 py-1 text-left font-medium whitespace-nowrap'>Over time</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {referenceSymbols !== undefined &&
                            renderRow(
                                'reference-row',
                                Object.fromEntries(
                                    positionLabels.map((label) => [label, referenceSymbols[label] ?? '?']),
                                ),
                                referenceRow?.count ?? 0,
                                referenceRow?.share ?? 0,
                                true,
                                true,
                            )}
                        {pageRows.map(({ pattern, count, share }) => {
                            const rowKey = positionLabels.map((label) => formatSymbol(pattern.symbols[label])).join('');
                            const patternSymbols = Object.fromEntries(
                                positionLabels.map((label) => [label, formatSymbol(pattern.symbols[label])]),
                            );
                            return renderRow(rowKey, patternSymbols, count, share, false, false);
                        })}
                        {pageRows.length === 0 && (
                            <tr>
                                <td colSpan={positionLabels.length + extraColumns} className='px-2 py-4 text-center'>
                                    No data available for your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className='mt-2'>
                <Pagination
                    pageIndex={pageIndex}
                    pageSize={pageSize}
                    pageSizes={pageSizes}
                    totalRows={totalRows}
                    onPageChange={setPageIndex}
                    onPageSizeChange={(newPageSize) => {
                        setPageSize(newPageSize);
                        setPageIndex(0);
                    }}
                    endContent={
                        <CsvDownloadButton
                            className='btn btn-xs'
                            label='Download CSV'
                            getData={getDownloadDataAsync}
                            filename='cooccurrence.csv'
                        />
                    }
                />
            </div>
        </div>
    );
};
