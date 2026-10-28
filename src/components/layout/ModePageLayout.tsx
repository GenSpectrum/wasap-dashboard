import { type ReactNode, useState } from 'react';

import { DatasetFilterPanel } from './DatasetFilterPanel';
import { useOrganismLayoutContext } from './OrganismLayout';

/**
 * The filter panel of an analysis mode on the left, and on the right the panel for the
 * dataset filter (the same for all modes) above the results. The sidebar and the results
 * fill the height of the page, in their own shade of grey.
 *
 * Below lg, the sidebar sits above the results and is collapsed behind a button, so that a
 * phone shows the results first: the filters always have values, so there is something to show.
 */
export function ModePageLayout({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
    const { dataset, onDatasetChange } = useOrganismLayoutContext();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className='flex-1 grid-cols-[300px_1fr] lg:grid'>
            <div className='bg-stone-200 px-4 py-3 lg:p-6'>
                <button
                    type='button'
                    className='flex w-full items-center justify-between py-1 text-sm font-semibold text-gray-700 lg:hidden'
                    aria-expanded={isSidebarOpen}
                    onClick={() => setIsSidebarOpen((isOpen) => !isOpen)}
                >
                    Analysis filters
                    <span className={`iconify text-xl ${isSidebarOpen ? 'mdi--chevron-up' : 'mdi--chevron-down'}`} />
                </button>
                <div className={`${isSidebarOpen ? 'mt-3 mb-3' : 'hidden'} lg:m-0 lg:block`}>{sidebar}</div>
            </div>
            <div className='flex min-w-0 flex-col'>
                <DatasetFilterPanel value={dataset} onChange={onDatasetChange} />
                <div className='flex-1 space-y-4 bg-stone-50 p-4 lg:p-6'>{children}</div>
            </div>
        </div>
    );
}
