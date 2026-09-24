import { type FC } from 'react';

import { MUTATIONS_OVER_TIME_MIN_PROPORTION, type ProportionValue } from '../../../query/queryMutationsOverTime';
import { type Temporal } from '../../../util/temporalClass';
import { formatProportion } from '../formatProportion';
import { OverTimeGridTooltip } from '../over-time-grid-tooltip';

export type QueriesOverTimeGridTooltipProps = {
    query: string; // displayLabel
    date: Temporal;
    value: ProportionValue;
};

export const QueriesOverTimeGridTooltip: FC<QueriesOverTimeGridTooltipProps> = ({
    query,
    date,
    value,
}: QueriesOverTimeGridTooltipProps) => {
    return (
        <OverTimeGridTooltip label={<span className='font-bold'>{query}</span>} date={date} value={value}>
            {value !== null && <TooltipValueCountsDescription value={value} queryLabel={query} />}
        </OverTimeGridTooltip>
    );
};

const TooltipValueCountsDescription: FC<{
    value: NonNullable<ProportionValue>;
    queryLabel: string;
}> = ({ value, queryLabel }) => {
    return (
        <div className='mt-2'>
            {(() => {
                switch (value.type) {
                    case 'belowThreshold':
                        return (
                            <p className='text-gray-600'>
                                None or less than {formatProportion(MUTATIONS_OVER_TIME_MIN_PROPORTION)} match the
                                query.
                            </p>
                        );

                    case 'valueWithCoverage':
                        return (
                            <>
                                <p>
                                    {value.count}{' '}
                                    <span className='text-gray-600'>match the query {queryLabel} out of</span>
                                </p>
                                <p>
                                    {value.coverage}{' '}
                                    <span className='text-gray-600'>with coverage for this query.</span>
                                </p>
                            </>
                        );
                }
            })()}

            <p>
                {value.totalCount} <span className='text-gray-600'>total in this date range.</span>
            </p>
        </div>
    );
};
