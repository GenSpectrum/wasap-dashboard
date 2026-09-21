import { useMemo } from 'react';

import { type WasapPageConfigFor } from '../../../../config/wasapPageConfig';
import { CovSpectrumCollectionPageStateHandler } from '../../../../pageState/wasap/handlers/CovSpectrumCollectionPageStateHandler';
import { CollectionResult } from '../../../dataDisplay/CollectionResult';
import { NothingSelected } from '../../../dataDisplay/NothingSelected';
import { WasapResults } from '../../../dataDisplay/WasapResults';
import { FilterSidebar } from '../../../filterSidebar/FilterSidebar';
import { CovSpectrumCollectionAnalysisFilter } from '../../../filterSidebar/filters/CovSpectrumCollectionAnalysisFilter';
import { ModePageLayout } from '../ModePageLayout';
import { useModePage } from '../useModePage';

export function CovSpectrumCollectionPage({ config }: { config: WasapPageConfigFor<'covSpectrumCollection'> }) {
    const pageStateHandler = useMemo(() => new CovSpectrumCollectionPageStateHandler(config), [config]);
    const page = useModePage(config, pageStateHandler);

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
                        <CovSpectrumCollectionAnalysisFilter
                            pageState={analysis}
                            setPageState={setAnalysis}
                            collectionsApiBaseUrl={config.collectionsApiBaseUrl}
                            collectionTitleFilter={config.collectionTitleFilter}
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
                        sourceLabel='CoV-Spectrum collection'
                        getCollectionUrl={(id) => `https://cov-spectrum.org/collections/${id}`}
                    />
                )}
            </WasapResults>
        </ModePageLayout>
    );
}
