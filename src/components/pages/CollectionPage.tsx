import { useMemo } from 'react';

import { ModePageLayout } from './ModePageLayout';
import { type WasapPageConfigFor } from '../../config/wasapPageConfig';
import { useCollectionQueries } from '../../externalData/useCollectionQueries';
import { usePageState } from '../../pageState/usePageState';
import { CollectionPageStateHandler } from '../../pageState/wasap/handlers/CollectionPageStateHandler';
import { useSiloReadFilter } from '../../pageState/wasap/useSiloReadFilter';
import { COLLECTION_SOURCE } from '../../pageState/wasap/wasapAnalysisFilter';
import { CollectionResult } from '../dataDisplay/CollectionResult';
import { NothingSelected } from '../dataDisplay/NothingSelected';
import { WasapResults } from '../dataDisplay/WasapResults';
import { FilterSidebar } from '../filterSidebar/FilterSidebar';
import { CollectionAnalysisFilter } from '../filterSidebar/filters/CollectionAnalysisFilter';

export function CollectionPage({ config }: { config: WasapPageConfigFor<'collection'> }) {
    const pageStateHandler = useMemo(() => new CollectionPageStateHandler(config), [config]);
    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { filter, isPending: isFilterPending } = useSiloReadFilter(base.locationName);
    const { data, isPending, isError } = useCollectionQueries(config, analysis.source, analysis.collectionId);
    const meanProportionInterval = useMemo(
        () => ({ min: base.meanProportion.lower, max: base.meanProportion.upper }),
        [base.meanProportion.lower, base.meanProportion.upper],
    );
    const isCovSpectrum = analysis.source === COLLECTION_SOURCE.covSpectrum;

    return (
        <ModePageLayout
            sidebar={
                <FilterSidebar
                    pageStateHandler={pageStateHandler}
                    base={base}
                    analysis={analysis}
                    setPageState={setPageState}
                >
                    {(analysis, setAnalysis) => (
                        <CollectionAnalysisFilter
                            pageState={analysis}
                            setPageState={setAnalysis}
                            organism={config.genSpectrumOrganismName}
                            covSpectrum={
                                config.covSpectrumCollectionSourceEnabled
                                    ? {
                                          collectionsApiBaseUrl: config.collectionsApiBaseUrl,
                                          collectionTitleFilter: config.collectionTitleFilter,
                                      }
                                    : undefined
                            }
                        />
                    )}
                </FilterSidebar>
            }
        >
            {analysis.collectionId === undefined ? (
                <NothingSelected title='No collection selected'>
                    Please select a collection from the filter panel.
                </NothingSelected>
            ) : (
                <WasapResults data={data} isError={isError} isPending={isPending || isFilterPending}>
                    {(data) => (
                        <CollectionResult
                            data={data}
                            filter={filter}
                            granularity={base.granularity}
                            meanProportionInterval={meanProportionInterval}
                            sourceLabel={isCovSpectrum ? 'CoV-Spectrum collection' : 'GenSpectrum collection'}
                            getCollectionUrl={(id) =>
                                isCovSpectrum
                                    ? `https://cov-spectrum.org/collections/${id}`
                                    : config.genSpectrumCollectionLinkOut.replace(
                                          '{{id}}',
                                          encodeURIComponent(String(id)),
                                      )
                            }
                        />
                    )}
                </WasapResults>
            )}
        </ModePageLayout>
    );
}
