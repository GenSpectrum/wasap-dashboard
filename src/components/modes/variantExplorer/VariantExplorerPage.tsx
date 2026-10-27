import { useMemo } from 'react';
import { type To } from 'react-router-dom';

import { ClinicalSequenceCountStat } from './ClinicalSequenceCountStat';
import { ExcludedMutations } from './ExcludedMutations';
import { VariantExplorerFilter } from './VariantExplorerFilter';
import { AmpliconCooccurrenceSection } from './ampliconCooccurrence/AmpliconCooccurrenceSection';
import { isModeEnabled, type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import {
    useSignatureWithoutBackground,
    type BackgroundLineage,
} from '../../../dataLayer/hooks/analyses/backgroundMutations';
import { ampliconNumbersByMutation } from '../../../externalData/fileBased/amplicons/mutationsByAmplicon';
import { useAmplicons } from '../../../externalData/fileBased/amplicons/useAmplicons';
import { getLineageSignature } from '../../../externalData/fileBased/lineageTree/lineageTree';
import {
    getFromDateForTimeFrame,
    isVariantSelected,
    useVariantSignature,
} from '../../../externalData/lapis/useVariantSignature';
import { usePageState } from '../../../pageState/usePageState';
import { datasetFilterSearchParams } from '../../../pageState/wasap/baseFilter';
import { VariantExplorerPageStateHandler } from '../../../pageState/wasap/handlers/VariantExplorerPageStateHandler';
import { useRhydbReadFilter } from '../../../pageState/wasap/useRhydbReadFilter';
import { modePath } from '../../../pageState/wasap/wasapModes';
import { FilterSidebar } from '../../filterSidebar/FilterSidebar';
import { ModePageLayout } from '../../layout/ModePageLayout';
import { NothingSelected } from '../../layout/NothingSelected';
import { useWasapLayoutContext } from '../../layout/WasapLayout';
import { MutationsResult } from '../../mutations/MutationsResult';
import { TitledPanel } from '../../ui/TitledPanel';
import { ErrorDisplay } from '../../ui/error-display';
import { LoadingDisplay } from '../../ui/loading-display';

/** No mutations are left out by their mean proportion here: the sidebar has the mutations to exclude instead. */
const ALL_MEAN_PROPORTIONS = { min: 0, max: 1 };

export function VariantExplorerPage({ config }: { config: WasapPageConfigFor<'variant'> }) {
    const pageStateHandler = useMemo(() => new VariantExplorerPageStateHandler(config), [config]);
    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { lineageTree } = useWasapLayoutContext();
    const amplicons = useAmplicons(config.amplicons);
    const { filter, isPending: isFilterPending } = useRhydbReadFilter(base.locationNames);
    const signature = useVariantSignature(config, analysis, lineageTree);

    // Opens an amplicon in the co-occurrence mode, to see all of its variable positions there, with
    // the variant added to the mode's default panel, to tell which patterns are the variant's.
    const variantName = analysis.signatureType === 'computed' ? analysis.variant : analysis.lineage;
    const cooccurrenceModeLink = isModeEnabled(config, 'cooccurrence')
        ? (anchorPosition: string): To => {
              const defaultPanel = config.filterDefaults.cooccurrence.panel ?? [];
              const panel =
                  variantName === undefined || defaultPanel.includes(variantName)
                      ? defaultPanel
                      : [...defaultPanel, variantName];
              const search = datasetFilterSearchParams(base, config);
              search.set('sequenceType', 'nucleotide');
              search.set('positionSource', 'amplicon');
              search.set('anchorPosition', anchorPosition);
              search.set('panel', panel.join('|'));
              return { pathname: modePath(config.path, 'cooccurrence'), search: `?${search.toString()}` };
          }
        : undefined;
    const backgroundLineages = useMemo(
        () =>
            (analysis.backgroundLineages ?? []).flatMap((name): BackgroundLineage[] => {
                const lineage = lineageTree?.lineages.get(name);
                if (lineage === undefined) {
                    return [];
                }
                const { nucleotide, aminoAcid } = getLineageSignature(lineage);
                return [{ name, mutations: analysis.sequenceType === 'nucleotide' ? nucleotide : aminoAcid }];
            }),
        [analysis.backgroundLineages, analysis.sequenceType, lineageTree],
    );
    const exclusionOptions = useMemo(
        () => ({
            excludeNearlyFixed: analysis.excludeNearlyFixed !== false,
            excludeDeletions: analysis.excludeDeletions !== false,
        }),
        [analysis.excludeNearlyFixed, analysis.excludeDeletions],
    );
    const { data, isPending, error } = useSignatureWithoutBackground(
        signature.data,
        backgroundLineages,
        exclusionOptions,
        filter,
        base.granularity,
        analysis.sequenceType,
    );
    const { clinicalLapis } = config;

    // Each section shows its own placeholder until what it needs is in: the signature, from the
    // clinical sequences, comes first; the mutations left after the background ones are taken out
    // of it, which need its mean proportions in the wastewater data, later.
    const resultError = signature.error ?? error;
    const isResultPending = signature.isPending || isPending || isFilterPending;
    const lineageForJaccard = signature.data?.lineageForJaccard;
    const jaccardLineage = analysis.signatureType === 'computed' ? analysis.variant : lineageForJaccard;

    const clinicalLapisProps = {
        analysis,
        clinicalLapisBaseUrl: clinicalLapis.lapisBaseUrl,
        clinicalLapisLineageField: clinicalLapis.lineageField,
        clinicalLapisDateField: clinicalLapis.dateField,
        warningThreshold: config.clinicalSequenceCountWarningThreshold,
    };

    return (
        <ModePageLayout
            sidebar={
                <FilterSidebar
                    withMeanProportion={false}
                    pageStateHandler={pageStateHandler}
                    base={base}
                    analysis={analysis}
                    setPageState={setPageState}
                >
                    {(draft, setDraft) => (
                        <VariantExplorerFilter
                            pageState={draft}
                            setPageState={setDraft}
                            clinicalSequenceLapisBaseUrl={clinicalLapis.lapisBaseUrl}
                            clinicalSequenceLapisLineageField={clinicalLapis.lineageField}
                            lineageTree={lineageTree}
                        />
                    )}
                </FilterSidebar>
            }
        >
            {!isVariantSelected(analysis) ? (
                <NothingSelected title='No variant selected'>
                    Please select a variant from the filter panel.
                </NothingSelected>
            ) : (
                <div className='space-y-4'>
                    {resultError !== null ? (
                        <ErrorDisplay error={resultError} />
                    ) : isResultPending || data === undefined ? (
                        <TitledPanel title='Mutations' info={<MutationsInfo />} boxed={false}>
                            <div className='h-48'>
                                <LoadingDisplay />
                            </div>
                        </TitledPanel>
                    ) : (
                        <MutationsResult
                            displayMutations={data.displayMutations}
                            jaccardIndices={data.jaccardIndices}
                            analysis={analysis}
                            filter={filter}
                            granularity={base.granularity}
                            sequenceType={analysis.sequenceType}
                            meanProportionInterval={ALL_MEAN_PROPORTIONS}
                            ampliconsByMutation={
                                amplicons.data === undefined || analysis.sequenceType !== 'nucleotide'
                                    ? undefined
                                    : ampliconNumbersByMutation(data.displayMutations, amplicons.data)
                            }
                            title='Mutations'
                            info={<MutationsInfo />}
                        />
                    )}
                    {config.amplicons !== undefined &&
                        analysis.sequenceType === 'nucleotide' &&
                        resultError === null && (
                            <AmpliconCooccurrenceSection
                                amplicons={config.amplicons}
                                cooccurrenceModeLink={cooccurrenceModeLink}
                                filter={filter}
                                granularity={base.granularity}
                                candidateMutations={isResultPending ? undefined : data?.candidateMutations}
                                minJaccard={analysis.minJaccard}
                                jaccardSource={
                                    jaccardLineage === undefined
                                        ? undefined
                                        : {
                                              lapisBaseUrl: clinicalLapis.lapisBaseUrl,
                                              lineageQuery: `${clinicalLapis.lineageField}=${jaccardLineage}`,
                                              dateField: clinicalLapis.dateField,
                                              dateFrom: getFromDateForTimeFrame(analysis.timeFrame),
                                          }
                                }
                            />
                        )}
                    {analysis.signatureType === 'computed' && analysis.variant !== undefined && (
                        <ClinicalSequenceCountStat
                            {...clinicalLapisProps}
                            lineage={analysis.variant}
                            queryKeyPrefix='variantFetchInfo'
                            title={`Clinical sequences for ${analysis.variant}`}
                            descriptionStart={`The number of clinical sequences for ${analysis.variant}`}
                            warningMessage='. Clinical signature calculation with this few sequences is not recommended.'
                        />
                    )}
                    {analysis.signatureType === 'predefined' && lineageForJaccard !== undefined && (
                        <ClinicalSequenceCountStat
                            {...clinicalLapisProps}
                            lineage={lineageForJaccard}
                            queryKeyPrefix='jaccardFetchInfo'
                            title='Jaccard index'
                            descriptionStart={`Clinical sequences for ${lineageForJaccard}`}
                            warningMessage='. Low sequence count may lead to unreliable Jaccard scores.'
                            zeroMessage='. No sequences found — min. Jaccard filter was not applied.'
                        />
                    )}
                    {resultError === null && (
                        <ExcludedMutations
                            mutations={isResultPending ? undefined : data?.excludedMutations}
                            backgroundLineages={backgroundLineages.map(({ name }) => name)}
                            sequenceType={analysis.sequenceType}
                        />
                    )}
                </div>
            )}
        </ModePageLayout>
    );
}

function MutationsInfo() {
    return (
        <div className='w-96 text-sm font-normal text-gray-700'>
            The variant&apos;s mutations with a Jaccard index of at least the minimum, each on its own: the share of the
            reads covering its position that carry it.
        </div>
    );
}
