import { type FC } from 'react';

export const NoDataDisplay: FC<{ message?: string }> = ({ message = 'No data available.' }) => {
    return (
        <div className='flex h-full w-full items-center justify-center border border-stone-300 bg-white p-2'>
            <div>{message}</div>
        </div>
    );
};
