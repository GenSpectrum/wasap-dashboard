import { useMemo, type FC } from 'react';

import { useSampleOverview } from '../../../dataLayer/hooks/sampleOverview';
import { readLocationOverview } from '../../../dataLayer/queries';
import { Loading } from '../../../util/Loading';

/** One row per location: its name, how many samples were collected there, and the most recent. */
export const LocationOverviewTable: FC = () => {
    const { data, isPending, isError, error } = useSampleOverview();
    const locations = useMemo(() => (data === undefined ? undefined : readLocationOverview(data)), [data]);

    if (isPending || locations === undefined) {
        return <Loading />;
    }

    if (isError) {
        return <span>{error.message}</span>;
    }

    return (
        <table className='w-full border border-stone-300 bg-white text-sm'>
            <thead>
                <tr className='border-b border-stone-300 text-left'>
                    <th className='p-2'>Location</th>
                    <th className='p-2'>Samples</th>
                    <th className='p-2'>Most recent sample</th>
                </tr>
            </thead>
            <tbody>
                {locations.map((location) => (
                    <tr key={location.name} className='border-b border-stone-200 last:border-b-0'>
                        <td className='p-2'>{location.name}</td>
                        <td className='p-2'>{location.sampleCount.toLocaleString('en-us')}</td>
                        <td className='p-2'>{location.mostRecentSampleDate}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};
