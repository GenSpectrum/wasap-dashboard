import type { FC, ReactNode } from 'react';

import { useBatchCount } from '../../../dataLayer/hooks/batchCount';
import { useSiloSchema } from '../../../dataLayer/hooks/connection';
import { useDateExtent } from '../../../dataLayer/hooks/dateExtent';
import { useLocationOverview } from '../../../dataLayer/hooks/locationOverview';
import { useStringFieldOptions } from '../../../dataLayer/hooks/stringFieldOptions';
import { useTotalReadCount } from '../../../dataLayer/hooks/totalReadCount';

/**
 * Whole-instance numbers for the organism: how much data there is, and where and when it was
 * collected. Unfiltered, the same as the per-location table below it — this is an overview of
 * everything the instance holds, not of a selection.
 */
export const OverviewStats: FC = () => (
    // daisyUI's stat tiles lay out as columns only inside `.stats` — a bare `.stat` hard-codes
    // `width: 100%`, so without it every tile would claim a row of its own. `.stats`' own columns
    // are content-sized by default (grid-auto-columns: auto); [grid-auto-columns:1fr] makes them equal.
    <div className='stats stats-horizontal w-full [grid-auto-columns:1fr] overflow-x-auto border border-stone-300 bg-white'>
        <LocationCount />
        <BatchCount />
        <SampleCount />
        <TotalCount />
        <DateRange />
    </div>
);

const LocationCount: FC = () => {
    const schema = useSiloSchema();
    const { data, isPending, isError, error } = useStringFieldOptions(schema.locationName);

    return (
        <Stat
            title='Locations'
            value={isPending ? '…' : isError ? 'Error' : data.length.toLocaleString('en-us')}
            description={isError ? error.message : 'Sampling sites'}
        />
    );
};

const BatchCount: FC = () => {
    const { data, isPending, isError, error } = useBatchCount();

    return (
        <Stat
            title='Batches'
            value={isPending ? '…' : isError ? 'Error' : data.toLocaleString('en-us')}
            description={isError ? error.message : 'Sequencing runs'}
        />
    );
};

const SampleCount: FC = () => {
    const { data, isPending, isError, error } = useLocationOverview();

    const total = data?.reduce((sum, location) => sum + location.sampleCount, 0);

    return (
        <Stat
            title='Samples'
            value={isPending ? '…' : isError ? 'Error' : (total ?? 0).toLocaleString('en-us')}
            description={isError ? error.message : 'Across all locations'}
        />
    );
};

const TotalCount: FC = () => {
    const { data, isPending, isError, error } = useTotalReadCount();

    return (
        <Stat
            title='Amplicon sequences'
            value={isPending ? '…' : isError ? 'Error' : data.toLocaleString('en-us')}
            description={isError ? error.message : 'Across all samples'}
        />
    );
};

const DateRange: FC = () => {
    const { data, isPending, isError, error } = useDateExtent();

    return (
        <Stat
            title='Sampling dates'
            value={
                isPending ? (
                    '…'
                ) : isError ? (
                    'Error'
                ) : data === null ? (
                    'No data'
                ) : (
                    <>
                        {data.min} <span className='text-stone-400'>to</span> {data.max}
                    </>
                )
            }
            description={isError ? error.message : 'Oldest to newest'}
        />
    );
};

const Stat: FC<{ title: string; value: ReactNode; description: string }> = ({ title, value, description }) => (
    <div className='stat'>
        <div className='stat-title'>{title}</div>
        <div className='stat-value text-base'>{value}</div>
        <div className='stat-desc text-wrap'>{description}</div>
    </div>
);
