import { type MeanProportionInterval } from '../mutationsOverTime/mutations-over-time';
import { type CustomColumn } from '../shared/features-over-time-grid';
import { type TemporalGranularity, type SequenceType, views } from '../../types/dashboardComponents';
import { type SiloReadFilter } from '../../queries';
import { type FC } from 'react';
import { GsMutationsOverTime as MutationsOverTime } from './gs-mutations-over-time';

import { ComponentWrapper } from '../ComponentWrapper';

export type GsMutationsOverTimeProps = {
    filter: SiloReadFilter;
    sequenceType: SequenceType;
    granularity: TemporalGranularity;
    displayMutations?: string[];
    height?: string;
    pageSizes?: number[];
    hideGaps?: true;
    initialMeanProportionInterval?: MeanProportionInterval;
    customColumns?: CustomColumn[];
};

export const GsMutationsOverTime: FC<GsMutationsOverTimeProps> = ({
    filter,
    sequenceType,
    granularity,
    displayMutations,
    height,
    pageSizes,
    hideGaps,
    initialMeanProportionInterval,
    customColumns,
}) => {
    return (
        <ComponentWrapper
            title={sequenceType === 'nucleotide' ? 'Nucleotide mutations over time' : 'Amino acid mutations over time'}
            height={height}
        >
            <MutationsOverTime
                width='100%'
                height={height ? '100%' : undefined}
                filter={filter}
                sequenceType={sequenceType}
                views={[views.grid]}
                granularity={granularity}
                displayMutations={displayMutations}
                hideGaps={hideGaps}
                pageSizes={pageSizes ?? [10, 20, 30, 40, 50]}
                initialMeanProportionInterval={initialMeanProportionInterval}
                customColumns={customColumns}
            />
        </ComponentWrapper>
    );
};
