import { type ReactNode } from 'react';

/** What is shown in place of the results when the filter panel still has to be used to pick something. */
export function NothingSelected({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className='rounded-md border-2 border-gray-100 p-4'>
            <h1 className='text-lg font-semibold'>{title}</h1>
            <p className='text-sm'>{children}</p>
        </div>
    );
}
