import {
    views,
    type CustomColumn,
    type LapisFilter,
    type MeanProportionInterval,
    type TemporalGranularity,
    type CountCoverageQuery,
} from 'wasap-components/util';
import { type FC } from 'react';
import { GsQueriesOverTime as QueriesOverTime } from 'wasap-components/gsComponents/gs-queries-over-time';

import { ComponentWrapper } from '../ComponentWrapper';

export type GsQueriesOverTimeProps = {
    collectionTitle?: string;
    lapisFilter: LapisFilter;
    queries: CountCoverageQuery[];
    granularity: TemporalGranularity;
    lapisDateField: string;
    height?: string;
    pageSizes?: number[];
    hideGaps?: true;
    initialMeanProportionInterval?: MeanProportionInterval;
    customColumns?: CustomColumn[];
};

export const GsQueriesOverTime: FC<GsQueriesOverTimeProps> = ({
    collectionTitle,
    lapisFilter,
    queries,
    granularity,
    lapisDateField,
    height,
    pageSizes,
    hideGaps,
    initialMeanProportionInterval,
    customColumns,
}) => {
    return (
        <ComponentWrapper
            title={'Collection over time' + (collectionTitle ? `: ${collectionTitle}` : '')}
            height={height}
        >
            <QueriesOverTime
                width='100%'
                height={height ? '100%' : undefined}
                lapisFilter={lapisFilter}
                queries={queries}
                views={[views.grid]}
                granularity={granularity}
                lapisDateField={lapisDateField}
                hideGaps={hideGaps}
                pageSizes={pageSizes ?? [10, 20, 30, 40, 50]}
                initialMeanProportionInterval={initialMeanProportionInterval}
                customColumns={customColumns}
            />
        </ComponentWrapper>
    );
};
