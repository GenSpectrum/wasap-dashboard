import { type ReactNode } from 'react';

import { LoadingDisplay } from '../shared/loading-display';

/**
 * The results of an analysis mode, once there are any. Until then it shows that
 * it is loading, or the error if the data could not be fetched.
 */
export function WasapResults<Data>({
    data,
    isError,
    isPending,
    children,
}: {
    data: Data | undefined;
    isError: boolean;
    isPending: boolean;
    children: (data: Data) => ReactNode;
}) {
    if (isError) {
        return <span>There was an error fetching the data to display.</span>;
    }

    if (isPending || data === undefined) {
        return <LoadingDisplay />;
    }

    return <div className='h-full space-y-4'>{children(data)}</div>;
}
