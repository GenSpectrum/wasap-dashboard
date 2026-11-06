import { useMemo, type ReactNode } from 'react';
import { type To } from 'react-router-dom';

import { DeconvolutionFilter } from './DeconvolutionFilter';
import { DeconvolutionPlot } from './DeconvolutionPlot';
import { LineagePanelTree } from './LineagePanelTree';
import { SignatureOverlapTable } from './SignatureOverlapTable';
import { deconvolutionOptions } from './granularityOptions';
import { lineageColors } from './lineageColors';
import { poolFrequencies } from './poolFrequencies';
import { isModeEnabled, type OrganismConfigFor } from '../../../config/organismConfig';
import { useMutationFrequencies } from '../../../dataLayer/hooks/analyses/mutationFrequencies';
import { type RhydbReadFilter } from '../../../dataLayer/queries';
import { type TemporalGranularity } from '../../../domain/temporal';
import {
    lineageSignatures,
    nucleotideSubstitutions,
} from '../../../externalData/fileBased/lineageTree/lineageSignatures';
import { getLineageSignature, type LineageTree } from '../../../externalData/fileBased/lineageTree/lineageTree';
import { informativeMutations } from '../../../externalData/lollipop/lollipopService';
import { useDeconvolution, useLollipopVersion } from '../../../externalData/lollipop/useDeconvolution';
import { effectivePanel } from '../../../pageState/analysisFilter';
import { datasetFilterSearchParams } from '../../../pageState/baseFilter';
import { DeconvolutionPageStateHandler } from '../../../pageState/handlers/DeconvolutionPageStateHandler';
import { modePath } from '../../../pageState/modes';
import { usePageState } from '../../../pageState/usePageState';
import { ModePageLayout } from '../../layout/ModePageLayout';
import { NothingSelected } from '../../layout/NothingSelected';
import { useOrganismLayoutContext } from '../../layout/OrganismLayout';
import { useRhydbReadFilter } from '../../layout/useRhydbReadFilter';
import { TitledPanel } from '../../ui/TitledPanel';

export function DeconvolutionPage({ config }: { config: OrganismConfigFor<'deconvolution'> }) {
    const pageStateHandler = useMemo(() => new DeconvolutionPageStateHandler(config), [config]);
    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { lineageTree } = useOrganismLayoutContext();
    const { filter, isPending: isFilterPending } = useRhydbReadFilter(base.locationNames);
    const panel = useMemo(() => effectivePanel(config.deconvolutionPanel, analysis), [config, analysis]);
    // of the lineages that are in the tree, as only those get into the deconvolution
    const colors = useMemo(
        () => lineageColors(panel.filter((name) => lineageTree?.lineages.has(name) === true)),
        [lineageTree, panel],
    );
    const overlapSignatures = useMemo(
        () => (lineageTree === undefined ? {} : panelSignatures(lineageTree, panel)),
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
            mode='deconvolution'
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
            {lineageTree !== undefined && panel.length > 1 && (
                <TitledPanel title='Signature overlap' info={<SignatureOverlapInfo />}>
                    <SignatureOverlapTable signatures={overlapSignatures} colors={colors} />
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
    filter: RhydbReadFilter;
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

    return (
        <>
            {notes}
            <TitledPanel title='Estimated prevalence' info={<DeconvolutionInfo />}>
                <DeconvolutionPlot
                    result={deconvolution.result}
                    colors={colors}
                    granularity={granularity}
                    lineageLink={lineageLink}
                    legendNote={<LollipopCredit />}
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
function DeconvolutionInfo() {
    return (
        <div className='w-96 max-w-full space-y-2 text-sm font-normal text-gray-700'>
            <p className='text-gray-500 italic'>
                Estimated share of each lineage of the panel, with the 95% confidence interval as a band.
            </p>
            <p>
                Shows which lineages are circulating and how their shares change. <em>Undetermined</em> is what the
                panel doesn&apos;t explain; if it grows, a lineage that isn&apos;t in the panel may be spreading.
            </p>
        </div>
    );
}

/**
 * The nucleotide substitutions of each lineage of the panel that is in the tree, as the
 * deconvolution uses them, but keeping lineages with the same signature as another one.
 */
function panelSignatures(lineageTree: LineageTree, panel: string[]): Record<string, string[]> {
    return Object.fromEntries(
        panel.flatMap((name) => {
            const lineage = lineageTree.lineages.get(name);
            return lineage === undefined
                ? []
                : [[name, nucleotideSubstitutions(getLineageSignature(lineage).nucleotide)]];
        }),
    );
}

function SignatureOverlapInfo() {
    return (
        <div className='w-96 max-w-full space-y-2 text-sm font-normal text-gray-700'>
            <p className='text-gray-500 italic'>
                Jaccard index and number of nucleotide substitutions that the signatures of two lineages of the panel
                share, leaving out those all of them share; the diagonal is the size of each signature.
            </p>
            <p>
                Shows which lineages are hard to tell apart: the fewer mutations only one of two lineages has, the less
                certain the split of their shares. <em>Unique</em> counts the mutations no other lineage of the panel
                has.
            </p>
        </div>
    );
}

/** Credits LolliPop, with the version the service runs once it is known. */
function LollipopCredit() {
    const version = useLollipopVersion();
    return (
        <span className='text-xs text-gray-500'>
            Computed with{' '}
            <a className='link' href='https://github.com/cbg-ethz/LolliPop' target='_blank' rel='noopener noreferrer'>
                LolliPop
            </a>
            {version !== undefined && ` ${version}`}
        </span>
    );
}

function Message({ children }: { children: ReactNode }) {
    return <div className='border border-amber-300 bg-amber-50 p-3 text-sm'>{children}</div>;
}
