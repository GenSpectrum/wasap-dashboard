import { type FC } from 'react';

export const Loading: FC = () => (
    <div
        aria-label='Loading'
        className='flex h-full w-full items-center justify-center border border-stone-300 bg-white'
    >
        <div className='loading loading-spinner loading-md text-neutral-500' />
    </div>
);
