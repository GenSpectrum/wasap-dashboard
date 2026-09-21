import { type ReactNode } from 'react';

/** The filter panel of an analysis mode next to its results. */
export function ModePageLayout({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
    return (
        <div className='grid-cols-[300px_1fr] gap-x-4 lg:grid'>
            <div className='h-fit p-2 shadow-lg'>{sidebar}</div>
            <div className='min-w-0 space-y-4'>{children}</div>
        </div>
    );
}
