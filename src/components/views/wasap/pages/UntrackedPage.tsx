import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { type WasapPageConfigFor } from '../../../../config/wasapPageConfig';
import { getCladeLineages } from '../../../../externalData/lapis/getCladeLineages';
import { UntrackedPageStateHandler } from '../../../../pageState/wasap/handlers/UntrackedPageStateHandler';
import { MutationsResult } from '../../../dataDisplay/MutationsResult';
import { WasapResults } from '../../../dataDisplay/WasapResults';
import { FilterSidebar } from '../../../filterSidebar/FilterSidebar';
import { UntrackedFilter } from '../../../filterSidebar/filters/UntrackedFilter';
import { ModePageLayout } from '../ModePageLayout';
import { useModePage } from '../useModePage';

export function UntrackedPage({ config }: { config: WasapPageConfigFor<'untracked'> }) {
    const pageStateHandler = useMemo(() => new UntrackedPageStateHandler(config), [config]);
    const page = useModePage(config, pageStateHandler);

    const { lapisBaseUrl, cladeField, lineageField } = config.clinicalLapis;
    // Keyed on the clinical-LAPIS coordinates the query actually targets, not just 'cladeLineages'.
    const cladeLineageQueryResult = useQuery({
        queryKey: ['cladeLineages', true, lapisBaseUrl, cladeField, lineageField],
        queryFn: () => getCladeLineages(lapisBaseUrl, cladeField, lineageField, true),
    });

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
                        <UntrackedFilter
                            pageState={analysis}
                            setPageState={setAnalysis}
                            clinicalSequenceLapisBaseUrl={lapisBaseUrl}
                            clinicalSequenceLapisLineageField={lineageField}
                            cladeLineageQueryResult={cladeLineageQueryResult}
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
