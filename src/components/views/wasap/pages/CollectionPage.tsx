import { useMemo } from 'react';

import { type WasapPageConfigFor } from '../../../../config/wasapPageConfig';
import { CollectionPageStateHandler } from '../../../../pageState/wasap/handlers/CollectionPageStateHandler';
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
                        sourceLabel='GenSpectrum collection'
                        getCollectionUrl={(id) =>
                            config.genSpectrumCollectionLinkOut.replace('{{id}}', encodeURIComponent(String(id)))
                        }
                    />
                )}
            </WasapResults>
        </ModePageLayout>
    );
}
