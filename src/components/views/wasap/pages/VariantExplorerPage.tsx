import { useMemo } from 'react';

import { type WasapPageConfigFor } from '../../../../config/wasapPageConfig';
import { VariantExplorerPageStateHandler } from '../../../../pageState/wasap/handlers/VariantExplorerPageStateHandler';
import { ClinicalSequenceCountStat } from '../../../dataDisplay/ClinicalSequenceCountStat';
import { MutationsResult } from '../../../dataDisplay/MutationsResult';
import { NothingSelected } from '../../../dataDisplay/NothingSelected';
import { WasapResults } from '../../../dataDisplay/WasapResults';
import { FilterSidebar } from '../../../filterSidebar/FilterSidebar';
import { VariantExplorerFilter } from '../../../filterSidebar/filters/VariantExplorerFilter';
import { ModePageLayout } from '../ModePageLayout';
import { useWasapLayoutContext } from '../WasapLayout';
import { useModePage } from '../useModePage';

export function VariantExplorerPage({ config }: { config: WasapPageConfigFor<'variant'> }) {
    const pageStateHandler = useMemo(() => new VariantExplorerPageStateHandler(config), [config]);
    const page = useModePage(config, pageStateHandler);
    const { analysis } = page;

    const { lineageTree } = useWasapLayoutContext();
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
                    base={page.base}
                    analysis={analysis}
                    setPageState={page.setPageState}
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
            <WasapResults
                page={page}
                placeholder={
                    analysis.signatureType === 'predefined' && analysis.lineage === undefined ? (
                        <NothingSelected title='No variant selected'>
                            Please select a variant from the filter panel.
                        </NothingSelected>
                    ) : undefined
                }
            >
                {(data) => {
                    const lineageForJaccard = data.type === 'mutations' ? data.lineageForJaccard : undefined;

                    return (
                        <MutationsResult page={page} data={data} sequenceType={analysis.sequenceType}>
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
                        </MutationsResult>
                    );
                }}
            </WasapResults>
        </ModePageLayout>
    );
}
