import { useMemo } from 'react';

import { type WasapPageConfigFor } from '../../../../config/wasapPageConfig';
import { ManualPageStateHandler } from '../../../../pageState/wasap/handlers/ManualPageStateHandler';
import { FilterSidebar } from '../../../filterSidebar/FilterSidebar';
import { ManualAnalysisFilter } from '../../../filterSidebar/filters/ManualAnalysisFilter';
import { ModePageLayout } from '../ModePageLayout';
import { MutationsResult } from '../MutationsResult';
import { WasapResults } from '../WasapResults';
import { useModePage } from '../useModePage';

export function ManualPage({ config }: { config: WasapPageConfigFor<'manual'> }) {
    const pageStateHandler = useMemo(() => new ManualPageStateHandler(config), [config]);
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
                        <ManualAnalysisFilter pageState={analysis} setPageState={setAnalysis} />
                    )}
                </FilterSidebar>
            }
        >
            <WasapResults page={page}>
                {(data) => <MutationsResult page={page} data={data} sequenceType={page.analysis.sequenceType} />}
            </WasapResults>
        </ModePageLayout>
    );
}
