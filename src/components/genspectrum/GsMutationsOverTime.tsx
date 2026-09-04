import {
    type TemporalGranularity,
    type LapisFilter,
    type SequenceType,
    type MeanProportionInterval,
    type CustomColumn,
    views,
} from 'wasap-components/util';
import { type FC } from 'react';
import { GsMutationsOverTime as MutationsOverTime } from 'wasap-components/gsComponents/gs-mutations-over-time';

import { ComponentWrapper } from '../ComponentWrapper';

export type GsMutationsOverTimeProps = {
    lapisFilter: LapisFilter;
    sequenceType: SequenceType;
    granularity: TemporalGranularity;
    lapisDateField: string;
    displayMutations?: string[];
    height?: string;
    pageSizes?: number[];
    hideGaps?: true;
    initialMeanProportionInterval?: MeanProportionInterval;
    customColumns?: CustomColumn[];
};

export const GsMutationsOverTime: FC<GsMutationsOverTimeProps> = ({
    lapisFilter,
    sequenceType,
    granularity,
    lapisDateField,
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
                lapisFilter={lapisFilter}
                sequenceType={sequenceType}
                views={[views.grid]}
                granularity={granularity}
                lapisDateField={lapisDateField}
                displayMutations={displayMutations}
                hideGaps={hideGaps}
                pageSizes={pageSizes ?? [10, 20, 30, 40, 50]}
                initialMeanProportionInterval={initialMeanProportionInterval}
                customColumns={customColumns}
            />
        </ComponentWrapper>
    );
};
