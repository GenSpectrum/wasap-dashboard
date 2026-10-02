import { useMemo } from 'react';

import { ModePageLayout } from './ModePageLayout';
import { useWasapLayoutContext } from './WasapLayout';
import { type WasapPageConfigFor } from '../../config/wasapPageConfig';
import { usePageState } from '../../pageState/usePageState';
import { ResistancePageStateHandler } from '../../pageState/wasap/handlers/ResistancePageStateHandler';
import { useSiloReadFilter } from '../../pageState/wasap/useSiloReadFilter';
import { Loading } from '../../util/Loading';
import { ResistanceResult } from '../dataDisplay/ResistanceResult';
import { ResistanceMutationsFilter } from '../filterSidebar/filters/ResistanceMutationsFilter';

export function ResistancePage({ config }: { config: WasapPageConfigFor<'resistance'> }) {
    const pageStateHandler = useMemo(() => new ResistancePageStateHandler(config), [config]);
    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { resistanceData } = useWasapLayoutContext();
    const { filter, isPending: isFilterPending } = useSiloReadFilter(base.locationName);
    const displayMutations = useMemo(
        () => resistanceData.displayMutationsBySet[analysis.resistanceSet] ?? [],
        [resistanceData, analysis.resistanceSet],
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
            {isFilterPending ? (
                <Loading />
            ) : (
                <ResistanceResult
                    displayMutations={displayMutations}
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
        </ModePageLayout>
    );
}
