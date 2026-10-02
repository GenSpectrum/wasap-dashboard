import { type ReactNode } from 'react';

import { NoDataHelperText } from './NoDataHelperText';
import { type MeanProportionInterval, MutationsOverTime } from './mutationsOverTime/mutations-over-time';
import { type SiloReadFilter } from '../../dataLayer/queries';
import { type WasapAnalysisFilter } from '../../pageState/wasap/wasapAnalysisFilter';
import { type SequenceType, type TemporalGranularity } from '../../types/dashboardComponents';

/**
 * The mutations over time of a mode that selects mutations, or a note that
 * none were selected. What the mode has to say about them besides goes below (`children`).
 */
export function MutationsResult({
    displayMutations,
    jaccardIndices,
    analysis,
    filter,
    granularity,
    sequenceType,
    meanProportionInterval,
    children,
}: {
    /** All mutations if `undefined`. */
    displayMutations: string[] | undefined;
    jaccardIndices?: Record<string, number>;
    /** For the note when there are no mutations, which says what to change to get some. */
    analysis: WasapAnalysisFilter;
    filter: SiloReadFilter;
    granularity: TemporalGranularity;
    sequenceType: SequenceType;
    meanProportionInterval: MeanProportionInterval;
    children?: ReactNode;
}) {
    return (
        <>
            {displayMutations?.length === 0 ? (
                <NoDataHelperText analysisFilter={analysis} />
            ) : (
                <MutationsOverTime
                    width='100%'
                    filter={filter}
                    sequenceType={sequenceType}
                    granularity={granularity}
                    displayMutations={displayMutations}
                    pageSizes={[20, 50, 100, 250]}
                    meanProportionInterval={meanProportionInterval}
                    jaccardIndices={jaccardIndices}
                />
            )}
            {children}
        </>
    );
}
