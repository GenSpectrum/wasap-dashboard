import { useMemo, type ReactNode } from 'react';

import { ModePageLayout } from './ModePageLayout';
import { useWasapLayoutContext } from './WasapLayout';
import { informativeMutations, type DeconvolutionOptions } from '../../../lollipop';
import { type WasapPageConfigFor } from '../../config/wasapPageConfig';
import { MIN_COVERAGE, useMutationFrequencies } from '../../dataLayer/hooks/mutationFrequencies';
import { type SiloReadFilter } from '../../dataLayer/queries';
import { deconvolutionOptions } from '../../deconvolution/granularityOptions';
import { lineageSignatures } from '../../deconvolution/lineageSignatures';
import { poolFrequencies } from '../../deconvolution/poolFrequencies';
import { useDeconvolution } from '../../deconvolution/useDeconvolution';
import { type LineageTree } from '../../lineageTree/lineageTree';
import { usePageState } from '../../pageState/usePageState';
import { DeconvolutionPageStateHandler } from '../../pageState/wasap/handlers/DeconvolutionPageStateHandler';
import { useSiloReadFilter } from '../../pageState/wasap/useSiloReadFilter';
import { type TemporalGranularity } from '../../types/dashboardComponents';
import { Loading } from '../../util/Loading';
import { DeconvolutionPlot } from '../dataDisplay/DeconvolutionPlot';
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
    const { filter, isPending: isFilterPending } = useSiloReadFilter(base.locationName);
    // of the lineages that are in the tree, as only those get into the deconvolution
    const colors = useMemo(
        () => lineageColors(analysis.panel.filter((name) => lineageTree?.lineages.has(name) === true)),
        [lineageTree, analysis.panel],
    );

    return (
        <ModePageLayout
            sidebar={
                // The panel is the only setting, so it is applied right away, without a button.
                <div className='flex flex-col gap-6'>
                    {lineageTree !== undefined && (
                        <DeconvolutionFilter
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
            {lineageTree === undefined ? (
                <Message>
                    The lineage tree, where the signatures of the lineages come from, could not be loaded.
                </Message>
            ) : base.locationName === undefined ? (
                <NothingSelected title='No location selected'>
                    The deconvolution estimates the lineages at one location. Please select one above.
                </NothingSelected>
            ) : analysis.panel.length < 2 ? (
                <NothingSelected title='Not enough lineages'>
                    Please select at least two lineages for the panel in the filter panel.
                </NothingSelected>
            ) : isFilterPending ? (
                <Loading />
            ) : (
                <DeconvolutionResults
                    lineageTree={lineageTree}
                    panel={analysis.panel}
                    colors={colors}
                    filter={filter}
                    granularity={base.granularity}
                />
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
}: {
    lineageTree: LineageTree;
    panel: string[];
    colors: Map<string, string>;
    filter: SiloReadFilter;
    granularity: TemporalGranularity;
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

    const { missing } = signatures;
    const missingNote = missing.length > 0 && (
        <Message>
            {missing.join(', ')} {missing.length === 1 ? 'is' : 'are'} not in the lineage tree, so{' '}
            {missing.length === 1 ? 'it is' : 'they are'} left out.
        </Message>
    );
    if (Object.keys(signatures.signatures).length < 2) {
        return (
            <>
                {missingNote}
                <NothingSelected title='Not enough lineages'>
                    Fewer than two lineages of the panel have a signature.
                </NothingSelected>
            </>
        );
    }
    if (deconvolution.status === 'error') {
        return <Message>The deconvolution failed: {deconvolution.error}</Message>;
    }
    if (frequencies.data === undefined || deconvolution.status !== 'done') {
        return <Loading />;
    }
    if (deconvolution.result.dates.length === 0) {
        return (
            <>
                {missingNote}
                <NothingSelected title='No samples'>
                    There are no samples with enough coverage at this location in this time range.
                </NothingSelected>
            </>
        );
    }

    const sampleCount = new Set(frequencies.data.map((frequency) => frequency.sampleId)).size;
    return (
        <>
            {missingNote}
            <TitledPanel
                title='Estimated prevalence'
                info={
                    <DeconvolutionInfo
                        sampleCount={sampleCount}
                        locationName={filter.locationName}
                        granularity={granularity}
                        signatures={signatures.signatures}
                        options={deconvolutionOptions(granularity)}
                    />
                }
            >
                <DeconvolutionPlot result={deconvolution.result} colors={colors} granularity={granularity} />
            </TitledPanel>
        </>
    );
}

/** What the plot shows and how it is computed, for the help button of its panel. */
function DeconvolutionInfo({
    sampleCount,
    locationName,
    granularity,
    signatures,
    options,
}: {
    sampleCount: number;
    locationName: string | undefined;
    granularity: TemporalGranularity;
    signatures: Record<string, string[]>;
    options: DeconvolutionOptions;
}) {
    const informative = new Set(informativeMutations(signatures));
    return (
        <div className='w-[32rem] space-y-2 text-sm font-normal text-gray-700'>
            <p>
                The share of each lineage of the panel among the virus at {locationName}, estimated from {sampleCount}{' '}
                samples on the {informative.size} mutations that tell the lineages apart. Each point is an estimate for
                a {granularity === 'day' ? 'sampling date' : `${granularity}, from the reads of its samples pooled`};
                the band is its 95% confidence interval. <em>Undetermined</em> is what the panel doesn&apos;t explain.
            </p>
            <p>
                Computed like{' '}
                <a className='link' href='https://github.com/cbg-ethz/LolliPop'>
                    LolliPop
                </a>
                : a robust (soft L1) non-negative regression of the mutation frequencies of all samples on the
                signatures of the lineages, with the samples weighted by a Gaussian kernel of their distance in time
                (variance {Math.round(options.bandwidth)} days²), repeated {options.bootstraps} times with the mutations
                resampled (a bootstrap). The line is the mean of the rounds, the band their 95% range. Frequencies are
                counted at positions covered by at least {MIN_COVERAGE} reads.
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
