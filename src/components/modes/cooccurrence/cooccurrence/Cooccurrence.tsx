import { Fragment, type FC, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, type To } from 'react-router-dom';

import { formatSymbol, type CooccurrenceOverTimeDataMap, type CooccurrencePattern } from './CooccurrenceOverTimeData';
import { type ClinicalLapisSource, usePanelLineageJaccards } from './usePanelLineageJaccards';
import {
    useAmpliconAnchor,
    labelFor,
    selectDiversePositions,
} from '../../../../dataLayer/hooks/analyses/ampliconPositions';
import {
    cooccurrenceTargets,
    filterCooccurrenceByMinShare,
    useCooccurrence,
} from '../../../../dataLayer/hooks/analyses/cooccurrence';
import { useRhydbSchema } from '../../../../dataLayer/hooks/connection';
import { type RhydbReadFilter } from '../../../../dataLayer/queries/filter';
import { type PositionTarget } from '../../../../dataLayer/queries/mutationsOverTime';
import {
    lineagePanelSymbols,
    matchingPanelLineages,
} from '../../../../externalData/fileBased/lineageTree/lineagePanelMatch';
import { type LineageTree } from '../../../../externalData/fileBased/lineageTree/lineageTree';
import { SubstitutionClass, type Substitution, type SequenceType } from '../../../../util/mutations';
import { type TemporalGranularity } from '../../../../util/temporal';
import { parsePositionToken } from '../../../inputs/positionFilter/parsePositionToken';
import { useMutationLinkProvider } from '../../../mutations/MutationLinkTemplateContext';
import {
    formatJaccardIndex,
    jaccardIndexShading,
    LegendEntry,
    LegendGroup,
    LegendStep,
} from '../../../overTime/FeatureBands';
import { CsvDownloadButton } from '../../../ui/CsvDownloadButton';
import { ErrorBoundary } from '../../../ui/ErrorBoundary';
import { HoverTooltip } from '../../../ui/HoverTooltip';
import { LoadingDisplay } from '../../../ui/LoadingDisplay';
import { NoDataDisplay } from '../../../ui/NoDataDisplay';
import { Pagination } from '../../../ui/Pagination';

type CooccurrenceBaseProps = {
    filter: RhydbReadFilter;
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
    /** The clinical sequences to compute the panel lineages' Jaccard indices in; none without. */
    clinicalLapis?: ClinicalLapisSource;
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
    const { nucleotideSequence } = useRhydbSchema();

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
    const { nucleotideSequence } = useRhydbSchema();

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

/** A row of the table: the pinned reference row or a pattern of the page. */
type ShownRow = {
    rowKey: string;
    /** `label -> symbol`. */
    symbols: Record<string, string>;
    count: number;
    share: number;
    isReference: boolean;
    /** The row's own mutations; see `substitutionsOf`. */
    substitutions: Substitution[];
    /** The panel lineages carrying exactly the row's pattern; `undefined` without a panel to match. */
    matches: string[] | undefined;
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

    // The reference row (pinned on every page) and the page's rows, with what is shown of them.
    const shownRows: ShownRow[] = useMemo(() => {
        const shownRow = (
            rowKey: string,
            symbols: Record<string, string>,
            count: number,
            share: number,
            isReference: boolean,
        ): ShownRow => ({
            rowKey,
            symbols,
            count,
            share,
            isReference,
            substitutions: substitutionsOf(symbols, positionLabels, sequenceType, referenceSymbols),
            matches:
                panelSymbols === undefined ? undefined : matchingPanelLineages(panelSymbols, positionLabels, symbols),
        });
        return [
            ...(referenceSymbols === undefined
                ? []
                : [
                      shownRow(
                          'reference-row',
                          Object.fromEntries(positionLabels.map((label) => [label, referenceSymbols[label] ?? '?'])),
                          referenceRow?.count ?? 0,
                          referenceRow?.share ?? 0,
                          true,
                      ),
                  ]),
            ...pageRows.map(({ pattern, count, share }) => {
                const symbols = Object.fromEntries(
                    positionLabels.map((label) => [label, formatSymbol(pattern.symbols[label])]),
                );
                const rowKey = positionLabels.map((label) => symbols[label]).join('');
                return shownRow(rowKey, symbols, count, share, false);
            }),
        ];
    }, [referenceRow, pageRows, panelSymbols, positionLabels, sequenceType, referenceSymbols]);

    // The Jaccard index of each shown row's exact panel matches and its mutations, in the clinical
    // sequences. Only for the exact matches: the score ignores the row's reference positions and a
    // lineage's extra mutations, so listing every panel lineage by its score (tried, from 0.1 on) put
    // lineages next to patterns they don't carry, e.g. XFG next to LP.8's pattern, which XFG carries
    // plus three more mutations of the amplicon. Might be worth playing with again: say, with the
    // reference positions in the query, or without the sublineages of other panel lineages.
    const jaccardRows = useMemo(
        () =>
            shownRows.map(({ rowKey, substitutions, matches }) => ({
                rowKey,
                codes: substitutions.map((substitution) => substitution.code),
                lineages: matches ?? [],
            })),
        [shownRows],
    );
    const { jaccards, pendingLineages } = usePanelLineageJaccards(jaccardRows, originalComponentProps.clinicalLapis);

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

    const renderRow = ({
        rowKey,
        symbols: patternSymbols,
        count,
        share,
        isReference,
        substitutions: rowSubstitutions,
        matches,
    }: ShownRow) => {
        const combinedLink =
            rowSubstitutions.length > 0
                ? linkProvider({ code: rowSubstitutions.map((s) => s.code).join(',') } as Substitution, sequenceType)
                : undefined;

        return (
            <tr key={rowKey} className={`border-b border-stone-100 ${isReference ? 'bg-stone-100' : ''}`}>
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
                        ) : (
                            <PanelMatchCell
                                matches={matches ?? []}
                                jaccards={jaccards?.get(rowKey)}
                                isJaccardLoading={(matches ?? []).some((lineage) => pendingLineages.has(lineage))}
                                variantModeLink={variantModeLink}
                            />
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
                                <th
                                    className='px-2 py-1 text-left font-medium whitespace-nowrap'
                                    title={
                                        'Panel lineages carrying exactly this pattern' +
                                        (jaccards === undefined
                                            ? ''
                                            : ', with the Jaccard index of their clinical sequences and those ' +
                                              "carrying all of the row's mutations")
                                    }
                                >
                                    Panel match
                                </th>
                            )}
                            <th className='px-2 py-1 text-left font-medium whitespace-nowrap'>CoV-Spectrum</th>
                            {manualModeLink && (
                                <th className='px-2 py-1 text-left font-medium whitespace-nowrap'>Over time</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {shownRows.map(renderRow)}
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
                    startContent={
                        referenceSymbols !== undefined || jaccards !== undefined ? (
                            <LegendButton
                                hasReference={referenceSymbols !== undefined}
                                hasJaccards={jaccards !== undefined}
                            />
                        ) : undefined
                    }
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

/**
 * The panel lineages matching a row exactly, by their Jaccard index (highest first) and with it,
 * once known.
 */
const PanelMatchCell: FC<{
    matches: string[];
    jaccards: ReadonlyMap<string, number> | undefined;
    isJaccardLoading: boolean;
    variantModeLink?: (lineage: string) => To;
}> = ({ matches, jaccards, isJaccardLoading, variantModeLink }) => {
    // Those without an index yet (loading, or failed) last, in panel order.
    const listed = [...matches].sort((a, b) => (jaccards?.get(b) ?? -1) - (jaccards?.get(a) ?? -1));

    if (listed.length === 0) {
        return '-';
    }
    return (
        <>
            {listed.map((lineage, index) => {
                const jaccard = jaccards?.get(lineage);
                return (
                    <Fragment key={lineage}>
                        {index > 0 && ', '}
                        {variantModeLink !== undefined ? (
                            <Link className='link' to={variantModeLink(lineage)}>
                                {lineage}
                            </Link>
                        ) : (
                            lineage
                        )}
                        {jaccard !== undefined && (
                            <JaccardBadge
                                jaccard={jaccard}
                                title={`Jaccard index of ${lineage} and the sequences with all of this row's mutations`}
                            />
                        )}
                    </Fragment>
                );
            })}
            {isJaccardLoading && <span className='loading loading-dots loading-xs ml-1' />}
        </>
    );
};

/** A Jaccard index as a small badge, shaded like the Jaccard index columns of the band grids, grey below. */
const JaccardBadge: FC<{ jaccard: number; title?: string }> = ({ jaccard, title }) => (
    <span
        className={`ml-1 rounded px-1 font-mono text-xs text-stone-700 ${jaccardIndexShading(jaccard) || 'bg-stone-100'}`}
        title={title}
    >
        {formatJaccardIndex(jaccard)}
    </span>
);

/** Example indices for the legend, one in each shade of `JaccardBadge`. */
const LEGEND_JACCARDS = [
    { jaccard: 0.5, label: '< .8' },
    { jaccard: 0.85, label: '≥ .8' },
    { jaccard: 0.95, label: '≥ .9' },
];

/** A button below the table that shows its legend while the mouse is over it (or it has the focus). */
const LegendButton: FC<LegendProps> = (props) => (
    <HoverTooltip content={<CooccurrenceLegend {...props} />} placement='top-start'>
        <button type='button' className='btn btn-xs'>
            Legend
        </button>
    </HoverTooltip>
);

type LegendProps = { hasReference: boolean; hasJaccards: boolean };

/**
 * What the symbols mean, when there's a reference to tell mutations by, and the Jaccard indices of
 * the panel matches, once there are any.
 */
const CooccurrenceLegend: FC<LegendProps> = ({ hasReference, hasJaccards }) => (
    <div className='flex flex-col gap-3 text-xs text-stone-600' data-testid='cooccurrence-legend'>
        {hasReference && (
            <>
                <LegendEntry marker={<span className='font-mono font-semibold text-black underline'>T</span>}>
                    Differs from the reference
                </LegendEntry>
                <LegendEntry marker={<span className='font-mono text-gray-400'>C</span>}>
                    Same as the reference
                </LegendEntry>
            </>
        )}
        {hasReference && hasJaccards && <hr className='border-stone-200' />}
        {hasJaccards && (
            <>
                <LegendGroup label='Jaccard index of a panel match'>
                    {LEGEND_JACCARDS.map(({ jaccard, label }) => (
                        <LegendStep key={label} label={label}>
                            <JaccardBadge jaccard={jaccard} />
                        </LegendStep>
                    ))}
                </LegendGroup>
                <span className='max-w-64'>
                    Of the lineage&apos;s clinical sequences and those with all of the row&apos;s mutations
                </span>
            </>
        )}
    </div>
);

/**
 * A row's own mutations — positions whose symbol differs from the reference, or every position if
 * there's no reference to compare to (the manual position source).
 */
function substitutionsOf(
    patternSymbols: Record<string, string>,
    positionLabels: readonly string[],
    sequenceType: SequenceType,
    referenceSymbols: Record<string, string | undefined> | undefined,
): Substitution[] {
    return positionLabels
        .filter((label) => referenceSymbols?.[label] !== patternSymbols[label])
        .map((label) => substitutionFor(label, patternSymbols[label], sequenceType, referenceSymbols))
        .filter((substitution): substitution is Substitution => substitution !== null);
}
