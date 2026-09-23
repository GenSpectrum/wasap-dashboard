import { type ReactNode } from 'react';

import { Loading } from '../../util/Loading';
import { type WasapPageData } from '../views/wasap/useWasapPageData';

/**
 * The results of an analysis mode, once there are any. Until then it shows that
 * it is loading, or the `placeholder` (like "No variant selected") if there is
 * nothing to load yet, or the error if the data could not be fetched.
 */
export function WasapResults({
    page,
    placeholder,
    children,
}: {
    page: { data: WasapPageData | undefined; isError: boolean; isPending: boolean };
    /**
     * Shown instead of the results when there is nothing to fetch yet, because something has to be
     * selected first. It is shown right away, not only once the fetch that can't work has given up.
     */
    placeholder?: ReactNode;
    children: (data: WasapPageData) => ReactNode;
}) {
    if (placeholder !== undefined && (page.isError || page.data === undefined)) {
        return placeholder;
    }

    if (page.isError) {
        return <span>There was an error fetching the data to display.</span>;
    }

    if (page.isPending || page.data === undefined) {
        return <Loading />;
    }

    return <div className='h-full space-y-4'>{children(page.data)}</div>;
}
