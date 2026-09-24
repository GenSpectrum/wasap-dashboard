import { type FC } from 'react';

import type { Deletion, Substitution } from '../../../util/mutations';
import { type Temporal } from '../../../util/temporalClass';
import { OverTimeGridTooltip } from '../over-time-grid-tooltip';
import { type ProportionValue } from '../overTime/proportionValue';

export type MutationsOverTimeGridTooltipProps = {
    mutation: Substitution | Deletion;
    date: Temporal;
    value: ProportionValue;
};

export const MutationsOverTimeGridTooltip: FC<MutationsOverTimeGridTooltipProps> = ({
    mutation,
    date,
    value,
}: MutationsOverTimeGridTooltipProps) => {
    return (
        <OverTimeGridTooltip label={<span className='font-bold'>{mutation.code}</span>} date={date} value={value}>
            {value !== null && (
                <TooltipValueCountsDescription
                    value={value}
                    mutationCode={mutation.code}
                    mutationPosition={mutation.position}
                />
            )}
        </OverTimeGridTooltip>
    );
};

const TooltipValueCountsDescription: FC<{
    value: NonNullable<ProportionValue>;
    mutationCode: string;
    mutationPosition: number;
}> = ({ value, mutationCode, mutationPosition }) => {
    return (
        <div className='mt-2'>
            {(() => {
                switch (value.type) {
                    case 'noCoverage':
                        return <p className='text-gray-600'>No reads cover position {mutationPosition}.</p>;

                    case 'value':
                        return (
                            <>
                                <p>
                                    {value.count}{' '}
                                    <span className='text-gray-600'>have the mutation {mutationCode} out of</span>
                                </p>
                                <p>
                                    {value.coverage}{' '}
                                    <span className='text-gray-600'>with coverage at position {mutationPosition}.</span>
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
