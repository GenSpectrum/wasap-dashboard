import { type FC } from 'react';

import { GsQueriesOverTime as QueriesOverTime } from './gs-queries-over-time';
import { type SiloReadFilter } from '../../dataLayer/queries';
import { views, type TemporalGranularity } from '../../types/dashboardComponents';
import { ComponentWrapper } from '../ComponentWrapper';
import { type MeanProportionInterval } from '../mutationsOverTime/mutations-over-time';
import { type QueriesOverTimeQuery } from '../queriesOverTime/queries-over-time';
import { type CustomColumn } from '../shared/features-over-time-grid';

export type GsQueriesOverTimeProps = {
    collectionTitle?: string;
    filter: SiloReadFilter;
    queries: QueriesOverTimeQuery[];
    granularity: TemporalGranularity;
    height?: string;
    pageSizes?: number[];
    hideGaps?: true;
    initialMeanProportionInterval?: MeanProportionInterval;
    customColumns?: CustomColumn[];
};

export const GsQueriesOverTime: FC<GsQueriesOverTimeProps> = ({
    collectionTitle,
    filter,
    queries,
    granularity,
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
                filter={filter}
                queries={queries}
                views={[views.grid]}
                granularity={granularity}
                hideGaps={hideGaps}
                pageSizes={pageSizes ?? [10, 20, 30, 40, 50]}
                initialMeanProportionInterval={initialMeanProportionInterval}
                customColumns={customColumns}
            />
        </ComponentWrapper>
    );
};
