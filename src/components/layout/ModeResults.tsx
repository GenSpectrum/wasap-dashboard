import { type ReactNode } from 'react';

import { ErrorDisplay } from '../ui/ErrorDisplay';
import { LoadingDisplay } from '../ui/LoadingDisplay';

/**
 * The results of an analysis mode, once there are any. Until then it shows that
 * it is loading, or the error if the data could not be fetched.
 */
export function ModeResults<Data>({
    data,
    error,
    isPending,
    children,
}: {
    data: Data | undefined;
    error: Error | null;
    isPending: boolean;
    children: (data: Data) => ReactNode;
}) {
    if (error !== null) {
        return <ErrorDisplay error={error} />;
    }

    if (isPending || data === undefined) {
        return <LoadingDisplay />;
    }

    return <div className='h-full space-y-4'>{children(data)}</div>;
}
