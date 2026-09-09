import {
    views,
    type CustomColumn,
    type MeanProportionInterval,
    type TemporalGranularity,
    type QueriesOverTimeQuery,
} from 'wasap-components/util';
import { type SiloReadFilter } from 'wasap-components/queries';
import { type FC } from 'react';
import { GsQueriesOverTime as QueriesOverTime } from 'wasap-components/gsComponents/gs-queries-over-time';

import { ComponentWrapper } from '../ComponentWrapper';

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
