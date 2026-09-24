import { type FC } from 'react';

import { type Temporal } from '../../../util/temporalClass';
import { OverTimeGridTooltip } from '../over-time-grid-tooltip';
import { type ProportionValue } from '../overTime/proportionValue';

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
                    case 'noCoverage':
                        return <p className='text-gray-600'>No reads cover the query.</p>;

                    case 'value':
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
