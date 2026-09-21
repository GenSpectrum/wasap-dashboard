import { useEffect, useMemo } from 'react';
import { type FC } from 'react';

import { useWasapLayoutContext } from './WasapLayout';
import { ClinicalSequenceCountStat } from './components/ClinicalSequenceCountStat';
import { CollectionInfo } from './components/CollectionInfo';
import { NoDataHelperText } from './components/NoDataHelperText';
import { WasapStats } from './components/WasapStats';
import { useWasapPageData } from './useWasapPageData';
import { getClientLogger } from '../../../clientLogger';
import type { WasapPageConfig } from '../../../config/wasapPageConfig';
import { type SiloReadFilter } from '../../../dataLayer/queries';
import { usePageState } from '../../../pageState/usePageState';
import { createModePageStateHandler } from '../../../pageState/wasap/handlers/createModePageStateHandler';
import type { WasapAnalysisMode } from '../../../pageState/wasap/wasapAnalysisFilter';
import { Loading } from '../../../util/Loading';
import { MutationsOverTime } from '../../mutationsOverTime/mutations-over-time';
import { WasapPageStateSelector } from '../../pageStateSelectors/wasap/WasapPageStateSelector';
import { QueriesOverTime } from '../../queriesOverTime/queries-over-time';

const logger = getClientLogger('WasapPage');

export type WasapPageProps = {
    config: WasapPageConfig;
    /** The analysis mode of the page, from the path of the URL. */
    mode: WasapAnalysisMode;
};

/**
 * The page of an analysis mode: the filter panel of the mode, and its results.
 * What all the modes share (dataset filter, mode tabs) is in `WasapLayout`.
 */
export const WasapPage: FC<WasapPageProps> = ({ config, mode }) => {
    const { resistanceData, samplingDate, isSamplingDatePending } = useWasapLayoutContext();

    // initialize page state from the URL
    const pageStateHandler = useMemo(() => createModePageStateHandler(config, mode), [config, mode]);

    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);

    const { displayMutationsBySet } = resistanceData;
    // fetch which mutations should be analyzed
    const {
        data,
        isPending: isDataPending,
        isError,
        error,
    } = useWasapPageData(config, displayMutationsBySet, analysis);

    useEffect(() => {
        if (error) {
            logger.error(`Failed to fetch wasap page data: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [error]);

    const isPending = isDataPending || isSamplingDatePending;

    const meanProportionInterval = useMemo(
        () => ({ min: base.meanProportion.lower, max: base.meanProportion.upper }),
        [base.meanProportion.lower, base.meanProportion.upper],
    );

    const filter: SiloReadFilter = {
        ...(base.locationName && { locationName: base.locationName }),
        ...(samplingDate.dateFrom && { samplingDateFrom: samplingDate.dateFrom }),
        ...(samplingDate.dateTo && { samplingDateTo: samplingDate.dateTo }),
    };

    const sequenceType = 'sequenceType' in analysis ? analysis.sequenceType : 'nucleotide';

    return (
        <div className='grid-cols-[300px_1fr] gap-x-4 lg:grid'>
            <div className='h-fit p-2 shadow-lg'>
                <WasapPageStateSelector
                    // Remount (rather than resync via an effect) whenever the URL-derived
                    // state changes, so the panel's in-progress draft state doesn't go
                    // stale after browser back/forward or opening a shared link while this
                    // page is already mounted. Safe to remount on every URL change, including
                    // the app's own "Apply filters" writes, since the new initial values
                    // always match what the draft already showed at that point. The dataset
                    // filter isn't part of the draft, so changing it doesn't reset the panel.
                    key={JSON.stringify({ analysis, meanProportion: base.meanProportion })}
                    config={config}
                    pageStateHandler={pageStateHandler}
                    baseFilter={base}
                    initialAnalysisFilterState={analysis}
                    setPageState={setPageState}
                    resistanceSetNames={Object.keys(displayMutationsBySet)}
                />
            </div>
            <div className='min-w-0 space-y-4'>
                {isError || data === undefined ? (
                    analysis.mode === 'variant' &&
                    analysis.signatureType === 'predefined' &&
                    analysis.collectionId === undefined ? (
                        <div className='rounded-md border-2 border-gray-100 p-4'>
                            <h1 className='text-lg font-semibold'>No variant selected</h1>
                            <p className='text-sm'>Please select a variant from the filter panel.</p>
                        </div>
                    ) : (analysis.mode === 'collection' || analysis.mode === 'covSpectrumCollection') &&
                      analysis.collectionId === undefined ? (
                        <div className='rounded-md border-2 border-gray-100 p-4'>
                            <h1 className='text-lg font-semibold'>No collection selected</h1>
                            <p className='text-sm'>Please select a collection from the filter panel.</p>
                        </div>
                    ) : (
                        <span>There was an error fetching the data to display.</span>
                    )
                ) : isPending ? (
                    <Loading />
                ) : (
                    <div className='h-full space-y-4 pr-4'>
                        {data.type === 'mutations' ? (
                            <>
                                {data.displayMutations?.length === 0 ? (
                                    <NoDataHelperText analysisFilter={analysis} />
                                ) : (
                                    <MutationsOverTime
                                        width='100%'
                                        filter={filter}
                                        sequenceType={sequenceType}
                                        granularity={base.granularity}
                                        displayMutations={data.displayMutations}
                                        hideGaps={base.excludeEmpty ? true : undefined}
                                        pageSizes={[20, 50, 100, 250]}
                                        meanProportionInterval={meanProportionInterval}
                                        customColumns={data.customColumns}
                                    />
                                )}
                                {analysis.mode === 'variant' &&
                                    analysis.signatureType === 'computed' &&
                                    config.variantAnalysisModeEnabled &&
                                    analysis.variant !== undefined && (
                                        <ClinicalSequenceCountStat
                                            lineage={analysis.variant}
                                            analysis={analysis}
                                            clinicalLapisBaseUrl={config.clinicalLapis.lapisBaseUrl}
                                            clinicalLapisLineageField={config.clinicalLapis.lineageField}
                                            clinicalLapisDateField={config.clinicalLapis.dateField}
                                            warningThreshold={config.clinicalSequenceCountWarningThreshold}
                                            queryKeyPrefix='variantFetchInfo'
                                            title={`Clinical sequences for ${analysis.variant}`}
                                            descriptionStart={`The number of clinical sequences for ${analysis.variant}`}
                                            warningMessage='. Clinical signature calculation with this few sequences is not recommended.'
                                        />
                                    )}
                                {analysis.mode === 'variant' &&
                                    analysis.signatureType === 'predefined' &&
                                    config.variantAnalysisModeEnabled &&
                                    data.lineageForJaccard !== undefined && (
                                        <ClinicalSequenceCountStat
                                            lineage={data.lineageForJaccard}
                                            analysis={analysis}
                                            clinicalLapisBaseUrl={config.clinicalLapis.lapisBaseUrl}
                                            clinicalLapisLineageField={config.clinicalLapis.lineageField}
                                            clinicalLapisDateField={config.clinicalLapis.dateField}
                                            warningThreshold={config.clinicalSequenceCountWarningThreshold}
                                            queryKeyPrefix='jaccardFetchInfo'
                                            title='Jaccard index'
                                            descriptionStart={`Clinical sequences for ${data.lineageForJaccard}`}
                                            warningMessage='. Low sequence count may lead to unreliable Jaccard scores.'
                                            zeroMessage='. No sequences found — min. Jaccard filter was not applied.'
                                        />
                                    )}
                            </>
                        ) : data.collection.queries.length === 0 ? (
                            <div className='rounded-md border-2 border-gray-100 p-4'>
                                <h1 className='text-lg font-semibold'>No valid variants</h1>
                                <p className='text-sm'>
                                    This collection has no valid variants to display. Check the collection configuration
                                    for errors.
                                </p>
                            </div>
                        ) : (
                            <>
                                <QueriesOverTime
                                    width='100%'
                                    filter={filter}
                                    queries={data.collection.queries}
                                    granularity={base.granularity}
                                    hideGaps={base.excludeEmpty ? true : undefined}
                                    pageSizes={[20, 50, 100, 250]}
                                    meanProportionInterval={meanProportionInterval}
                                />
                                <CollectionInfo
                                    collectionId={data.collection.id}
                                    collectionTitle={data.collection.title}
                                    sourceLabel={
                                        analysis.mode === 'covSpectrumCollection'
                                            ? 'CoV-Spectrum collection'
                                            : 'GenSpectrum collection'
                                    }
                                    collectionUrl={
                                        analysis.mode === 'covSpectrumCollection'
                                            ? `https://cov-spectrum.org/collections/${data.collection.id}`
                                            : config.collectionAnalysisModeEnabled
                                              ? config.genSpectrumCollectionLinkOut.replace(
                                                    '{{id}}',
                                                    encodeURIComponent(String(data.collection.id)),
                                                )
                                              : undefined
                                    }
                                    invalidVariants={data.invalidVariants}
                                />
                            </>
                        )}
                        <WasapStats />
                    </div>
                )}
            </div>
        </div>
    );
};
