import { type ReactNode } from 'react';

import { WasapStats } from './components/WasapStats';
import { type WasapPageData } from './useWasapPageData';
import { Loading } from '../../../util/Loading';

/**
 * The results of an analysis mode, once there are any. Until then it shows the
 * `placeholder` (like "No variant selected"), or an error, or that it is loading.
 */
export function WasapResults({
    page,
    placeholder,
    children,
}: {
    page: { data: WasapPageData | undefined; isError: boolean; isPending: boolean };
    /** Shown instead of the error when the data could not be fetched, because there is nothing to fetch yet. */
    placeholder?: ReactNode;
    children: (data: WasapPageData) => ReactNode;
}) {
    if (page.isError || page.data === undefined) {
        return placeholder ?? <span>There was an error fetching the data to display.</span>;
    }

    if (page.isPending) {
        return <Loading />;
    }

    return (
        <div className='h-full space-y-4 pr-4'>
            {children(page.data)}
            <WasapStats />
        </div>
    );
}
