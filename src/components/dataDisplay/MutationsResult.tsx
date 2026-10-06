import { type ReactElement, type ReactNode } from 'react';

import { NoDataHelperText } from './NoDataHelperText';
import { type MeanProportionInterval, MutationsOverTime } from './mutationsOverTime/mutations-over-time';
import { type SiloReadFilter } from '../../dataLayer/queries';
import { type WasapAnalysisFilter } from '../../pageState/wasap/wasapAnalysisFilter';
import { type SequenceType, type TemporalGranularity } from '../../types/dashboardComponents';
import { TitledPanel } from '../shared/TitledPanel';

/**
 * The mutations over time of a mode that selects mutations, or a note that
 * none were selected. What the mode has to say about them besides goes below (`children`).
 * With a `title`, the mutations over time get it above them (and `info` behind a help button).
 */
export function MutationsResult({
    displayMutations,
    jaccardIndices,
    analysis,
    filter,
    granularity,
    sequenceType,
    meanProportionInterval,
    title,
    info,
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
    title?: string;
    info?: ReactElement;
    children?: ReactNode;
}) {
    const mutationsOverTime = (
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
    );
    return (
        <>
            {displayMutations?.length === 0 ? (
                <NoDataHelperText analysisFilter={analysis} />
            ) : title === undefined ? (
                mutationsOverTime
            ) : (
                <TitledPanel title={title} info={info} boxed={false}>
                    {mutationsOverTime}
                </TitledPanel>
            )}
            {children}
        </>
    );
}
