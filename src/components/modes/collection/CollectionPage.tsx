import { useMemo } from 'react';

import { CollectionAnalysisFilter } from './CollectionAnalysisFilter';
import { CollectionResult } from './CollectionResult';
import { type OrganismConfigFor } from '../../../config/organismConfig';
import { useCollectionQueries } from '../../../externalData/useCollectionQueries';
import { COLLECTION_SOURCE } from '../../../pageState/analysisFilter';
import { CollectionPageStateHandler } from '../../../pageState/handlers/CollectionPageStateHandler';
import { usePageState } from '../../../pageState/usePageState';
import { useRhydbReadFilter } from '../../../pageState/useRhydbReadFilter';
import { FilterSidebar } from '../../filterSidebar/FilterSidebar';
import { ModePageLayout } from '../../layout/ModePageLayout';
import { ModeResults } from '../../layout/ModeResults';
import { NothingSelected } from '../../layout/NothingSelected';

export function CollectionPage({ config }: { config: OrganismConfigFor<'collection'> }) {
    const pageStateHandler = useMemo(() => new CollectionPageStateHandler(config), [config]);
    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { filter, isPending: isFilterPending } = useRhydbReadFilter(base.locationNames);
    const { data, isPending, error } = useCollectionQueries(config, analysis.source, analysis.collectionId);
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
                <ModeResults data={data} error={error} isPending={isPending || isFilterPending}>
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
                </ModeResults>
            )}
        </ModePageLayout>
    );
}
