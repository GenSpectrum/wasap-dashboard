import { useMemo } from 'react';

import { type WasapPageConfigFor } from '../../../../config/wasapPageConfig';
import { ResistancePageStateHandler } from '../../../../pageState/wasap/handlers/ResistancePageStateHandler';
import { MutationsResult } from '../../../dataDisplay/MutationsResult';
import { WasapResults } from '../../../dataDisplay/WasapResults';
import { FilterSidebar } from '../../../filterSidebar/FilterSidebar';
import { ResistanceMutationsFilter } from '../../../filterSidebar/filters/ResistanceMutationsFilter';
import { ModePageLayout } from '../ModePageLayout';
import { useModePage } from '../useModePage';

export function ResistancePage({ config }: { config: WasapPageConfigFor<'resistance'> }) {
    const pageStateHandler = useMemo(() => new ResistancePageStateHandler(config), [config]);
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
                        <ResistanceMutationsFilter
                            pageState={analysis}
                            setPageState={setAnalysis}
                            resistanceSetNames={page.resistanceSetNames}
                        />
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
