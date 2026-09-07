import { type FC, type ReactNode } from 'react';

import { useTotalReadCount } from 'wasap-components/data/reads';
import { useConnection } from 'wasap-components/data/connection';

/**
 * Renders its children only once the SILO instance has answered a trivial
 * query; otherwise shows an unreachable notice. Must be mounted inside a
 * `ConnectionProvider`.
 *
 * (Replaces `LapisUnreachableWrapperClient` — same behaviour, SILO probe.)
 */
export const SiloUnreachableWrapper: FC<{ children: ReactNode }> = ({ children }) => {
    const connection = useConnection();
    const { isError, isLoading } = useTotalReadCount();

    if (!isLoading && isError) {
        return (
            <div className='flex h-full w-full items-center justify-center rounded-md border-2 border-red-200 bg-red-50 p-8'>
                <div className='text-center'>
                    <h2 className='mb-2 text-xl font-bold text-red-700'>Data Source Unreachable</h2>
                    <p className='text-red-600'>
                        Unable to connect to the data source at{' '}
                        <code className='rounded bg-red-100 px-1'>{connection.url}</code>.
                    </p>
                    <p className='mt-2 text-sm text-red-500'>
                        Please try again later or contact support if the problem persists.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
