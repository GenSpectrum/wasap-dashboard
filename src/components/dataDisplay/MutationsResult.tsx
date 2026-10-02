import { type ReactNode } from 'react';

import { NoDataHelperText } from './NoDataHelperText';
import { type MeanProportionInterval, MutationsOverTime } from './mutationsOverTime/mutations-over-time';
import { type SiloReadFilter } from '../../dataLayer/queries';
import { type WasapAnalysisFilter } from '../../pageState/wasap/wasapAnalysisFilter';
import { type SequenceType, type TemporalGranularity } from '../../types/dashboardComponents';
import { type WasapPageData } from '../views/wasap/useWasapPageData';

/**
 * The mutations over time of a mode that selects mutations, or a note that
 * none were selected. What the mode has to say about them besides goes below (`children`).
 */
export function MutationsResult({
    data,
    analysis,
    filter,
    granularity,
    sequenceType,
    meanProportionInterval,
    children,
}: {
    data: WasapPageData;
    /** For the note when there are no mutations, which says what to change to get some. */
    analysis: WasapAnalysisFilter;
    filter: SiloReadFilter;
    granularity: TemporalGranularity;
    sequenceType: SequenceType;
    meanProportionInterval: MeanProportionInterval;
    children?: ReactNode;
}) {
    if (data.type !== 'mutations') {
        throw Error(`Expected mutations, but the data is of type '${data.type}'.`);
    }

    return (
        <>
            {data.displayMutations?.length === 0 ? (
                <NoDataHelperText analysisFilter={analysis} />
            ) : (
                <MutationsOverTime
                    width='100%'
                    filter={filter}
                    sequenceType={sequenceType}
                    granularity={granularity}
                    displayMutations={data.displayMutations}
                    pageSizes={[20, 50, 100, 250]}
                    meanProportionInterval={meanProportionInterval}
                    jaccardIndices={data.jaccardIndices}
                />
            )}
            {children}
        </>
    );
}
