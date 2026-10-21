import { useMemo, type ReactNode } from 'react';
import { type To } from 'react-router-dom';

import { ModePageLayout } from './ModePageLayout';
import { useWasapLayoutContext } from './WasapLayout';
import { isModeEnabled, type WasapPageConfigFor } from '../../config/wasapPageConfig';
import { MIN_COVERAGE, useMutationFrequencies } from '../../dataLayer/hooks/mutationFrequencies';
import { type SiloReadFilter } from '../../dataLayer/queries';
import { deconvolutionOptions } from '../../deconvolution/granularityOptions';
import { lineageSignatures } from '../../deconvolution/lineageSignatures';
import { informativeMutations, type DeconvolutionOptions } from '../../deconvolution/lollipopService';
import { poolFrequencies } from '../../deconvolution/poolFrequencies';
import { useDeconvolution, useLollipopVersion } from '../../deconvolution/useDeconvolution';
import { type LineageTree } from '../../lineageTree/lineageTree';
import { usePageState } from '../../pageState/usePageState';
import { datasetFilterSearchParams } from '../../pageState/wasap/baseFilter';
import { DeconvolutionPageStateHandler } from '../../pageState/wasap/handlers/DeconvolutionPageStateHandler';
import { useSiloReadFilter } from '../../pageState/wasap/useSiloReadFilter';
import { effectivePanel } from '../../pageState/wasap/wasapAnalysisFilter';
import { modePath } from '../../pageState/wasap/wasapModes';
import { type TemporalGranularity } from '../../types/dashboardComponents';
import { DeconvolutionPlot } from '../dataDisplay/DeconvolutionPlot';
import { LineagePanelTree } from '../dataDisplay/LineagePanelTree';
import { NothingSelected } from '../dataDisplay/NothingSelected';
import { lineageColors } from '../dataDisplay/lineageColors';
import { DeconvolutionFilter } from '../filterSidebar/filters/DeconvolutionFilter';
import { TitledPanel } from '../shared/TitledPanel';

export function DeconvolutionPage({ config }: { config: WasapPageConfigFor<'deconvolution'> }) {
    const pageStateHandler = useMemo(() => new DeconvolutionPageStateHandler(config), [config]);
    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { lineageTree } = useWasapLayoutContext();
    const { filter, isPending: isFilterPending } = useSiloReadFilter(base.locationNames);
    const panel = useMemo(() => effectivePanel(config.deconvolutionPanel, analysis), [config, analysis]);
    // of the lineages that are in the tree, as only those get into the deconvolution
    const colors = useMemo(
        () => lineageColors(panel.filter((name) => lineageTree?.lineages.has(name) === true)),
        [lineageTree, panel],
    );
    const lineageLink = isModeEnabled(config, 'variant')
        ? (lineage: string): To => {
              const search = datasetFilterSearchParams(base, config);
              search.set('signatureType', 'predefined');
              search.set('lineage', lineage);
              return { pathname: modePath(config.path, 'variant'), search: `?${search.toString()}` };
          }
        : undefined;

    return (
        <ModePageLayout
            sidebar={
                // The extra lineage is the only setting, so it is applied right away, without a button.
                <div className='flex flex-col gap-6'>
                    {lineageTree !== undefined && (
                        <DeconvolutionFilter
                            panel={config.deconvolutionPanel}
                            pageState={analysis}
                            setPageState={(newAnalysis) =>
                                setPageState((pageState) => ({ ...pageState, analysis: newAnalysis }))
                            }
                            lineageTree={lineageTree}
                        />
                    )}
                </div>
            }
        >
            <div role='alert' className='alert border-amber-300 bg-amber-100 text-sm text-amber-950'>
                <span>
                    <strong>Experimental:</strong> the lineage prevalence estimates are a work in progress, and the
                    numbers might be incorrect.
                </span>
            </div>
            {lineageTree === undefined ? (
                <Message>
                    The lineage tree, where the signatures of the lineages come from, could not be loaded.
                </Message>
            ) : panel.length < 2 ? (
                <NothingSelected title='Not enough lineages'>
                    The panel of lineages needs at least two lineages.
                </NothingSelected>
            ) : isFilterPending ? (
                <PrevalenceLoading />
            ) : (
                <DeconvolutionResults
                    lineageTree={lineageTree}
                    panel={panel}
                    colors={colors}
                    filter={filter}
                    granularity={base.granularity}
                    lineageLink={lineageLink}
                />
            )}
            {lineageTree !== undefined && panel.length > 0 && (
                <TitledPanel title='Lineage tree'>
                    <LineagePanelTree
                        lineageTree={lineageTree}
                        panel={panel}
                        colors={colors}
                        lineageLink={lineageLink}
                    />
                </TitledPanel>
            )}
        </ModePageLayout>
    );
}

function DeconvolutionResults({
    lineageTree,
    panel,
    colors,
    filter,
    granularity,
    lineageLink,
}: {
    lineageTree: LineageTree;
    panel: string[];
    colors: Map<string, string>;
    filter: SiloReadFilter;
    granularity: TemporalGranularity;
    lineageLink: ((lineage: string) => To) | undefined;
}) {
    const signatures = useMemo(() => lineageSignatures(lineageTree, panel), [lineageTree, panel]);
    const mutations = useMemo(() => informativeMutations(signatures.signatures), [signatures]);
    const frequencies = useMutationFrequencies(filter, mutations);

    const input = useMemo(() => {
        if (frequencies.data === undefined || Object.keys(signatures.signatures).length < 2) {
            return undefined;
        }
        return {
            signatures: signatures.signatures,
            frequencies: poolFrequencies(frequencies.data, granularity),
            options: deconvolutionOptions(granularity),
        };
    }, [signatures, frequencies.data, granularity]);
    const deconvolution = useDeconvolution(input);

    if (frequencies.error) {
        return <Message>There was an error fetching the data: {frequencies.error.message}</Message>;
    }

    const { missing, indistinguishable } = signatures;
    const notes = (
        <>
            {missing.length > 0 && (
                <Message>
                    {missing.join(', ')} {missing.length === 1 ? 'is' : 'are'} not in the lineage tree, so{' '}
                    {missing.length === 1 ? 'it is' : 'they are'} left out.
                </Message>
            )}
            {indistinguishable.map(({ lineage, sameAs }) => (
                <Message key={lineage}>
                    {lineage} has the same signature as {sameAs}, so the two can&apos;t be told apart: {lineage} is left
                    out, and the share of {sameAs} includes it.
                </Message>
            ))}
        </>
    );
    if (Object.keys(signatures.signatures).length < 2) {
        return (
            <>
                {notes}
                <NothingSelected title='Not enough lineages'>
                    Fewer than two lineages of the panel have a signature of their own.
                </NothingSelected>
            </>
        );
    }
    if (deconvolution.status === 'error') {
        return <Message>The deconvolution failed: {deconvolution.error}</Message>;
    }
    if (frequencies.data === undefined || deconvolution.status !== 'done') {
        return <PrevalenceLoading />;
    }
    if (deconvolution.result.dates.length === 0) {
        return (
            <>
                {notes}
                <NothingSelected title='No samples'>
                    There are no samples with enough coverage at this location in this time range.
                </NothingSelected>
            </>
        );
    }

    const sampleCount = new Set(frequencies.data.map((frequency) => frequency.sampleId)).size;
    return (
        <>
            {notes}
            <TitledPanel
                title='Estimated prevalence'
                info={
                    <DeconvolutionInfo
                        sampleCount={sampleCount}
                        locationNames={filter.locationNames}
                        granularity={granularity}
                        signatures={signatures.signatures}
                        options={deconvolutionOptions(granularity)}
                    />
                }
            >
                <DeconvolutionPlot
                    result={deconvolution.result}
                    colors={colors}
                    granularity={granularity}
                    lineageLink={lineageLink}
                />
            </TitledPanel>
        </>
    );
}

/**
 * The panel of the plot while it is computed, as high as the plot with its legend, so that the
 * page doesn't jump when the plot comes in.
 */
function PrevalenceLoading() {
    return (
        <TitledPanel title='Estimated prevalence'>
            <div aria-label='Loading' className='flex h-80 items-center justify-center'>
                <div className='loading loading-spinner loading-md text-neutral-500' />
            </div>
        </TitledPanel>
    );
}

/** What the plot shows and how it is computed, for the help button of its panel. */
function DeconvolutionInfo({
    sampleCount,
    locationNames,
    granularity,
    signatures,
    options,
}: {
    sampleCount: number;
    locationNames: string[] | undefined;
    granularity: TemporalGranularity;
    signatures: Record<string, string[]>;
    options: DeconvolutionOptions;
}) {
    const informative = new Set(informativeMutations(signatures));
    const lollipopVersion = useLollipopVersion();
    return (
        <div className='w-[32rem] space-y-2 text-sm font-normal text-gray-700'>
            <p>
                The share of each lineage of the panel among the virus {locationsText(locationNames)}, estimated from{' '}
                {sampleCount} samples on the {informative.size} mutations that tell the lineages apart. Each point is an
                estimate for a{' '}
                {granularity === 'day' ? 'sampling date' : `${granularity}, from the reads of its samples pooled`}; the
                band is its 95% confidence interval. <em>Undetermined</em> is what the panel doesn&apos;t explain.
            </p>
            <p>
                Computed with{' '}
                <a className='link' href='https://github.com/cbg-ethz/LolliPop'>
                    LolliPop
                </a>
                {lollipopVersion !== undefined && ` ${lollipopVersion}`}: a robust (soft L1) non-negative regression of
                the mutation frequencies of all samples on the signatures of the lineages, with the samples weighted by
                a Gaussian kernel of their distance in time (variance {Math.round(options.bandwidth)} days²), repeated{' '}
                {options.bootstraps} times with the mutations resampled (a bootstrap). The line is the mean of the
                rounds, the band their 95% range. Frequencies are counted at positions covered by at least{' '}
                {MIN_COVERAGE} reads.
            </p>
            <p>
                The signatures are the nucleotide substitutions of the lineages in Nextclade&apos;s reference tree.
                Telling the lineages apart:{' '}
                {Object.entries(signatures)
                    .map(
                        ([lineage, mutations]) =>
                            `${lineage} ${mutations.filter((m) => informative.has(m)).length} of ${mutations.length}`,
                    )
                    .join(', ')}
                .
            </p>
        </div>
    );
}

function Message({ children }: { children: ReactNode }) {
    return <div className='border border-amber-300 bg-amber-50 p-3 text-sm'>{children}</div>;
}

/** Where the reads come from: "at Basel (BS)", "at Basel (BS) and Chur (GR)", or "at all locations". */
function locationsText(locationNames: string[] | undefined): string {
    if (locationNames === undefined) {
        return 'at all locations, pooled';
    }
    if (locationNames.length === 1) {
        return `at ${locationNames[0]}`;
    }
    return `at ${locationNames.slice(0, -1).join(', ')} and ${locationNames[locationNames.length - 1]}, pooled`;
}
