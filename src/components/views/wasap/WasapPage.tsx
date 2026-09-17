import { useEffect, useMemo, useState } from 'react';
import { type Dispatch, type FC, type SetStateAction } from 'react';

import { ClinicalSequenceCountStat } from './components/ClinicalSequenceCountStat';
import { CollectionInfo } from './components/CollectionInfo';
import { NoDataHelperText } from './components/NoDataHelperText';
// import { WasapStats } from './components/WasapStats';
import { getInitialMeanProportionInterval } from './initialMeanProportionInterval';
import type { ResistanceData } from './resistanceData';
import { useResolvedSamplingDate } from './useResolvedSamplingDate';
import { useWasapPageData, type WasapPageData } from './useWasapPageData';
import { getClientLogger } from '../../../clientLogger';
import { siloSchema } from '../../../config/siloSchema';
import type { WasapPageConfig } from '../../../config/wasapPageConfig';
import { ConnectionProvider } from '../../../dataLayer/hooks/connection';
import { type SiloReadFilter } from '../../../dataLayer/queries';
import { usePageState } from '../../../pageState/usePageState';
import { WasapPageStateHandler } from '../../../pageState/wasap/WasapPageStateHandler';
import type { WasapAnalysisFilter, WasapBaseFilter, WasapFilter } from '../../../pageState/wasap/wasapAnalysisFilter';
import { views } from '../../../types/dashboardComponents';
import { Loading } from '../../../util/Loading';
import { ComponentWrapper } from '../../ComponentWrapper';
import { GsApp } from '../../GsApp';
import { SiloUnreachableWrapper } from '../../SiloUnreachableWrapper';
import { MutationsOverTime } from '../../mutationsOverTime/mutations-over-time';
import { BaseFilterControls } from '../../pageStateSelectors/wasap/BaseFilterControls';
import { WasapPageStateSelector } from '../../pageStateSelectors/wasap/WasapPageStateSelector';
import { QueriesOverTime } from '../../queriesOverTime/queries-over-time';

const logger = getClientLogger('WasapPage');

export type WasapPageProps = {
    config: WasapPageConfig;
    resistanceData: ResistanceData;
};

export const WasapPage: FC<WasapPageProps> = ({ config, resistanceData }) => {
    // initialize page state from the URL
    const pageStateHandler = useMemo(() => new WasapPageStateHandler(config), [config]);

    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);

    const { mutationAnnotations, displayMutationsBySet } = resistanceData;
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

    const schema = useMemo(() => siloSchema(config.silo), [config.silo]);

    return (
        <ConnectionProvider url={config.silo.url} schema={schema}>
            <SiloUnreachableWrapper>
                <WasapPageConnected
                    // Remount (rather than resync via an effect) whenever the URL-derived
                    // state changes, so in-progress draft state (base filter controls above
                    // the plot, plus the mode-specific filter panel) doesn't go stale after
                    // browser back/forward or opening a shared link while this page is
                    // already mounted. Safe to remount on every URL change, including the
                    // app's own "Apply filters" writes, since the new initial values always
                    // match what the draft already showed at that point.
                    key={JSON.stringify({ base, analysis })}
                    config={config}
                    base={base}
                    analysis={analysis}
                    data={data}
                    isDataPending={isDataPending}
                    isError={isError}
                    mutationAnnotations={mutationAnnotations}
                    displayMutationsBySet={displayMutationsBySet}
                    pageStateHandler={pageStateHandler}
                    setPageState={setPageState}
                />
            </SiloUnreachableWrapper>
        </ConnectionProvider>
    );
};

type WasapPageConnectedProps = {
    config: WasapPageConfig;
    base: WasapBaseFilter;
    analysis: WasapAnalysisFilter;
    data: WasapPageData | undefined;
    isDataPending: boolean;
    isError: boolean;
    mutationAnnotations: ResistanceData['mutationAnnotations'];
    displayMutationsBySet: ResistanceData['displayMutationsBySet'];
    pageStateHandler: WasapPageStateHandler;
    setPageState: Dispatch<SetStateAction<WasapFilter>>;
};

/**
 * Everything that needs the SILO connection context — split out from
 * `WasapPage` because `useResolvedSamplingDate` (below) reads the connection
 * via `useDateExtent`, which only works inside the `ConnectionProvider`
 * `WasapPage` itself renders (a component can't consume a context it creates).
 */
const WasapPageConnected: FC<WasapPageConnectedProps> = ({
    config,
    base,
    analysis,
    data,
    isDataPending,
    isError,
    mutationAnnotations,
    displayMutationsBySet,
    pageStateHandler,
    setPageState,
}) => {
    // Owned here (rather than in WasapPageStateSelector) so it can also drive
    // BaseFilterControls, rendered above the plot instead of in the sidebar.
    const [baseFilterState, setBaseFilterState] = useState(base);

    // resolve a preset-label-only samplingDate (e.g. from a freshly loaded URL) into concrete dates
    const { samplingDate, isPending: isSamplingDatePending } = useResolvedSamplingDate(base.samplingDate);
    const isPending = isDataPending || isSamplingDatePending;

    const initialMeanProportionInterval = getInitialMeanProportionInterval(analysis);

    const filter: SiloReadFilter = {
        ...(base.locationName && { locationName: base.locationName }),
        ...(samplingDate.dateFrom && { samplingDateFrom: samplingDate.dateFrom }),
        ...(samplingDate.dateTo && { samplingDateTo: samplingDate.dateTo }),
    };

    const sequenceType = 'sequenceType' in analysis ? analysis.sequenceType : 'nucleotide';

    return (
        <GsApp
            lapis={config.lapisBaseUrl}
            mutationAnnotations={mutationAnnotations}
            mutationLinkTemplate={config.linkTemplate}
        >
            <div className='flex-1 grid-cols-[300px_1fr] lg:grid'>
                <div className='h-full rounded-l-lg bg-blue-50 p-4'>
                    <WasapPageStateSelector
                        config={config}
                        pageStateHandler={pageStateHandler}
                        baseFilterState={baseFilterState}
                        initialAnalysisFilterState={analysis}
                        setPageState={setPageState}
                        resistanceSetNames={Object.keys(displayMutationsBySet)}
                    />
                </div>
                <div className='flex flex-col'>
                    <BaseFilterControls
                        locationNameField={config.locationNameField}
                        baseFilterState={baseFilterState}
                        setBaseFilterState={setBaseFilterState}
                    />
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
                        <div className='h-full space-y-4 rounded-tl-none rounded-tr-none rounded-br-lg rounded-bl-none bg-gray-50 p-6'>
                            {data.type === 'mutations' ? (
                                <>
                                    {data.displayMutations?.length === 0 ? (
                                        <NoDataHelperText analysisFilter={analysis} />
                                    ) : (
                                        <ComponentWrapper
                                            title={
                                                sequenceType === 'nucleotide'
                                                    ? 'Nucleotide mutations over time'
                                                    : 'Amino acid mutations over time'
                                            }
                                        >
                                            <MutationsOverTime
                                                width='100%'
                                                filter={filter}
                                                sequenceType={sequenceType}
                                                views={[views.grid]}
                                                granularity={base.granularity}
                                                displayMutations={data.displayMutations}
                                                hideGaps={base.excludeEmpty ? true : undefined}
                                                pageSizes={[20, 50, 100, 250]}
                                                initialMeanProportionInterval={initialMeanProportionInterval}
                                                customColumns={data.customColumns}
                                            />
                                        </ComponentWrapper>
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
                                        This collection has no valid variants to display. Check the collection
                                        configuration for errors.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className='rounded-md border-2 border-gray-100 p-4'>
                                        <ComponentWrapper
                                            title={`Collection over time${data.collection.title ? `: ${data.collection.title}` : ''}`}
                                        >
                                            <QueriesOverTime
                                                width='100%'
                                                filter={filter}
                                                queries={data.collection.queries}
                                                views={[views.grid]}
                                                granularity={base.granularity}
                                                hideGaps={base.excludeEmpty ? true : undefined}
                                                pageSizes={[20, 50, 100, 250]}
                                                initialMeanProportionInterval={initialMeanProportionInterval}
                                            />
                                        </ComponentWrapper>
                                    </div>
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
                            {/* <WasapStats /> */}
                        </div>
                    )}
                </div>
            </div>
        </GsApp>
    );
};
