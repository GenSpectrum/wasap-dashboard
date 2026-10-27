import { useMemo } from 'react';

import { ResistanceMutationsFilter } from './ResistanceMutationsFilter';
import { ResistanceResult } from './ResistanceResult';
import { type WasapPageConfigFor } from '../../../config/wasapPageConfig';
import { usePageState } from '../../../pageState/usePageState';
import { ResistancePageStateHandler } from '../../../pageState/wasap/handlers/ResistancePageStateHandler';
import { useRhydbReadFilter } from '../../../pageState/wasap/useRhydbReadFilter';
import { ModePageLayout } from '../../layout/ModePageLayout';
import { useOrganismLayoutContext } from '../../layout/OrganismLayout';
import { LoadingDisplay } from '../../ui/LoadingDisplay';

export function ResistancePage({ config }: { config: WasapPageConfigFor<'resistance'> }) {
    const pageStateHandler = useMemo(() => new ResistancePageStateHandler(config), [config]);
    const {
        pageState: { base, analysis },
        setPageState,
    } = usePageState(pageStateHandler);
    const { resistanceData } = useOrganismLayoutContext();
    const { filter, isPending: isFilterPending } = useRhydbReadFilter(base.locationNames);
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
                <LoadingDisplay />
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
