import { type ReactElement, type ReactNode } from 'react';

import { NoDataHelperText } from './NoDataHelperText';
import { type RhydbReadFilter } from '../../dataLayer/queries';
import { type AnalysisFilter } from '../../pageState/analysisFilter';
import { type SequenceType } from '../../util/mutations';
import { type TemporalGranularity } from '../../util/temporal';
import { MutationsOverTime } from '../overTime/mutationsOverTime/MutationsOverTime';
import { type ProportionInterval } from '../overTime/mutationsOverTime/getFilteredMutationCodes';
import { TitledPanel } from '../ui/TitledPanel';

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
    ampliconsByMutation,
    title,
    info,
    children,
}: {
    /** All mutations if `undefined`. */
    displayMutations: string[] | undefined;
    jaccardIndices?: Record<string, number>;
    /** For the note when there are no mutations, which says what to change to get some. */
    analysis: AnalysisFilter;
    filter: RhydbReadFilter;
    granularity: TemporalGranularity;
    sequenceType: SequenceType;
    meanProportionInterval: ProportionInterval;
    /** The numbers of the amplicons each mutation is in, by code; with it, the mutations get a column of them. */
    ampliconsByMutation?: Record<string, number[]>;
    title?: string;
    info?: ReactElement;
    children?: ReactNode;
}) {
    const mutationsOverTime = (
        <MutationsOverTime
            filter={filter}
            sequenceType={sequenceType}
            granularity={granularity}
            displayMutations={displayMutations}
            pageSizes={[20, 50, 100, 250]}
            meanProportionInterval={meanProportionInterval}
            jaccardIndices={jaccardIndices}
            ampliconsByMutation={ampliconsByMutation}
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
