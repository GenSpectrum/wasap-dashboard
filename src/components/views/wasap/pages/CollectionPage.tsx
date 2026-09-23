import { useMemo } from 'react';

import { type WasapPageConfigFor } from '../../../../config/wasapPageConfig';
import { CollectionPageStateHandler } from '../../../../pageState/wasap/handlers/CollectionPageStateHandler';
import { COLLECTION_SOURCE } from '../../../../pageState/wasap/wasapAnalysisFilter';
import { CollectionResult } from '../../../dataDisplay/CollectionResult';
import { NothingSelected } from '../../../dataDisplay/NothingSelected';
import { WasapResults } from '../../../dataDisplay/WasapResults';
import { FilterSidebar } from '../../../filterSidebar/FilterSidebar';
import { CollectionAnalysisFilter } from '../../../filterSidebar/filters/CollectionAnalysisFilter';
import { ModePageLayout } from '../ModePageLayout';
import { useModePage } from '../useModePage';

export function CollectionPage({ config }: { config: WasapPageConfigFor<'collection'> }) {
    const pageStateHandler = useMemo(() => new CollectionPageStateHandler(config), [config]);
    const page = useModePage(config, pageStateHandler);
    const isCovSpectrum = page.analysis.source === COLLECTION_SOURCE.covSpectrum;

    return (
        <ModePageLayout
            sidebar={
                <FilterSidebar
                    pageStateHandler={pageStateHandler}
                    base={page.base}
                    analysis={page.analysis}
                    setPageState={page.setPageState}
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
            <WasapResults
                page={page}
                placeholder={
                    page.analysis.collectionId === undefined ? (
                        <NothingSelected title='No collection selected'>
                            Please select a collection from the filter panel.
                        </NothingSelected>
                    ) : undefined
                }
            >
                {(data) => (
                    <CollectionResult
                        page={page}
                        data={data}
                        sourceLabel={isCovSpectrum ? 'CoV-Spectrum collection' : 'GenSpectrum collection'}
                        getCollectionUrl={(id) =>
                            isCovSpectrum
                                ? `https://cov-spectrum.org/collections/${id}`
                                : config.genSpectrumCollectionLinkOut.replace('{{id}}', encodeURIComponent(String(id)))
                        }
                    />
                )}
            </WasapResults>
        </ModePageLayout>
    );
}
