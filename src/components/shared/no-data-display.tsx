import { type FC } from 'react';

export const NoDataDisplay: FC<{ message?: string }> = ({ message = 'No data available.' }) => {
    return (
        <div className='flex h-full w-full items-center justify-center border-2 border-gray-100 p-2'>
            <div>{message}</div>
        </div>
    );
};
