import { useMemo } from 'react';

import { ModePageLayout } from './ModePageLayout';
import { useWasapLayoutContext } from './WasapLayout';
import { ampliconNumbersByMutation } from '../../amplicons/mutationsByAmplicon';
import { useAmplicons } from '../../amplicons/useAmplicons';
import { type WasapPageConfigFor } from '../../config/wasapPageConfig';
import { useSignatureWithoutBackground, type BackgroundLineage } from '../../dataLayer/hooks/backgroundMutations';
import { getFromDateForTimeFrame, useVariantSignature } from '../../externalData/lapis/useVariantSignature';
import { getLineageSignature } from '../../lineageTree/lineageTree';
import { usePageState } from '../../pageState/usePageState';
import { VariantExplorerPageStateHandler } from '../../pageState/wasap/handlers/VariantExplorerPageStateHandler';
import { useSiloReadFilter } from '../../pageState/wasap/useSiloReadFilter';
import { ClinicalSequenceCountStat } from '../dataDisplay/ClinicalSequenceCountStat';
import { ExcludedMutations } from '../dataDisplay/ExcludedMutations';
import { MutationsResult } from '../dataDisplay/MutationsResult';
import { NothingSelected } from '../dataDisplay/NothingSelected';
import { WasapResults } from '../dataDisplay/WasapResults';
import { AmpliconCooccurrenceSection } from '../dataDisplay/ampliconCooccurrence/AmpliconCooccurrenceSection';
import { FilterSidebar } from '../filterSidebar/FilterSidebar';
import { VariantExplorerFilter } from '../filterSidebar/filters/VariantExplorerFilter';

export function VariantExplorerPage({ config }: { config: WasapPageConfigFor<'variant'> }) {
    const pageStateHandler = useMemo(() => new VariantExplorerPageStateHandler(config), [config]);
    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { lineageTree } = useWasapLayoutContext();
    const amplicons = useAmplicons(config.amplicons);
    const { filter, isPending: isFilterPending } = useSiloReadFilter(base.locationName);
    const signature = useVariantSignature(config, analysis, lineageTree);
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
    const meanProportionInterval = useMemo(
        () => ({ min: base.meanProportion.lower, max: base.meanProportion.upper }),
        [base.meanProportion.lower, base.meanProportion.upper],
    );
    const { clinicalLapis } = config;

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
            {analysis.signatureType === 'predefined' && analysis.lineage === undefined ? (
                <NothingSelected title='No variant selected'>
                    Please select a variant from the filter panel.
                </NothingSelected>
            ) : (
                <WasapResults
                    data={data}
                    error={signature.error ?? error}
                    isPending={signature.isPending || isPending || isFilterPending}
                >
                    {({
                        displayMutations,
                        candidateMutations,
                        jaccardIndices,
                        lineageForJaccard,
                        excludedMutations,
                    }) => {
                        const jaccardLineage =
                            analysis.signatureType === 'computed' ? analysis.variant : lineageForJaccard;
                        return (
                            <MutationsResult
                                displayMutations={displayMutations}
                                jaccardIndices={jaccardIndices}
                                analysis={analysis}
                                filter={filter}
                                granularity={base.granularity}
                                sequenceType={analysis.sequenceType}
                                meanProportionInterval={meanProportionInterval}
                                ampliconsByMutation={
                                    amplicons.data === undefined || analysis.sequenceType !== 'nucleotide'
                                        ? undefined
                                        : ampliconNumbersByMutation(displayMutations, amplicons.data)
                                }
                                title='Mutations'
                                info={<MutationsInfo />}
                            >
                                {config.amplicons !== undefined &&
                                    analysis.sequenceType === 'nucleotide' &&
                                    candidateMutations.length !== 0 && (
                                        <AmpliconCooccurrenceSection
                                            amplicons={config.amplicons}
                                            filter={filter}
                                            granularity={base.granularity}
                                            candidateMutations={candidateMutations}
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
                                <ExcludedMutations
                                    mutations={excludedMutations}
                                    backgroundLineages={backgroundLineages.map(({ name }) => name)}
                                    sequenceType={analysis.sequenceType}
                                />
                            </MutationsResult>
                        );
                    }}
                </WasapResults>
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
