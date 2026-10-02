import { useMemo } from 'react';

import { type WasapPageConfigFor } from '../../../../config/wasapPageConfig';
import { usePageState } from '../../../../pageState/usePageState';
import { ResistancePageStateHandler } from '../../../../pageState/wasap/handlers/ResistancePageStateHandler';
import { ResistanceResult } from '../../../dataDisplay/ResistanceResult';
import { WasapResults } from '../../../dataDisplay/WasapResults';
import { ResistanceMutationsFilter } from '../../../filterSidebar/filters/ResistanceMutationsFilter';
import { ModePageLayout } from '../ModePageLayout';
import { useWasapLayoutContext } from '../WasapLayout';
import { useSiloReadFilter } from '../useSiloReadFilter';
import { useWasapPageData } from '../useWasapPageData';

export function ResistancePage({ config }: { config: WasapPageConfigFor<'resistance'> }) {
    const pageStateHandler = useMemo(() => new ResistancePageStateHandler(config), [config]);
    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { resistanceData, lineageTree } = useWasapLayoutContext();
    const { filter, isPending: isFilterPending } = useSiloReadFilter(base.locationName);
    const { data, isPending, isError } = useWasapPageData(
        config,
        resistanceData.displayMutationsBySet,
        analysis,
        lineageTree,
    );

    return (
        <ModePageLayout
            sidebar={
                // The only setting is the resistance set, so it is applied right away, without a button.
                <ResistanceMutationsFilter
                    pageState={analysis}
                    setPageState={(newAnalysis) =>
                        setPageState((pageState) => ({ ...pageState, analysis: newAnalysis }))
                    }
                    resistanceSetNames={Object.keys(resistanceData.displayMutationsBySet)}
                />
            }
        >
            <WasapResults data={data} isError={isError} isPending={isPending || isFilterPending}>
                {(data) => (
                    <ResistanceResult
                        data={data}
                        analysis={analysis}
                        filter={filter}
                        granularity={base.granularity}
                        onProportionRangeChange={(proportionRange) =>
                            setPageState((pageState) => ({
                                ...pageState,
                                analysis: { ...pageState.analysis, proportionRange },
                            }))
                        }
                    />
                )}
            </WasapResults>
        </ModePageLayout>
    );
}
