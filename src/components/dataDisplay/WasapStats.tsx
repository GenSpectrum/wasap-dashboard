import type { FC } from 'react';

import { useDateExtent } from '../../dataLayer/hooks/dateExtent';
import { useTotalReadCount } from '../../dataLayer/hooks/totalReadCount';

export const WasapStats: FC = () => (
    <div className='flex min-w-[180px] flex-col gap-4 border border-stone-300 bg-white sm:flex-row'>
        <TotalCount />
        <DateRange />
    </div>
);

const TotalCount: FC = () => {
    const { data, isPending, isError, error } = useTotalReadCount();

    return (
        <div className='stat'>
            <div className='stat-title'>Amplicon sequences</div>
            <div className='stat-value text-base'>
                {isPending ? '…' : isError ? 'Error' : data.toLocaleString('en-us')}
            </div>
            <div className='stat-desc text-wrap'>
                {isPending
                    ? 'Loading total amplicon sequences count…'
                    : isError
                      ? error.message
                      : 'The total number of amplicon sequences in all samples'}
            </div>
        </div>
    );
};

const DateRange: FC = () => {
    const { data, isPending, isError, error } = useDateExtent();

    return (
        <div className='stat'>
            <div className='stat-title'>Sampling Dates</div>
            <div className='stat-value text-base'>
                {isPending ? '…' : isError ? 'Error' : data === null ? 'No data' : `${data.min} to ${data.max}`}
            </div>
            <div className='stat-desc text-wrap'>
                {isPending
                    ? 'Loading date range…'
                    : isError
                      ? error.message
                      : 'The start and end dates of collected samples'}
            </div>
        </div>
    );
};
