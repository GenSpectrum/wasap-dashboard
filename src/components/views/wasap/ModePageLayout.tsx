import { type ReactNode } from 'react';

import { useWasapLayoutContext } from './WasapLayout';
import { DatasetFilterPanel } from '../../DatasetFilterPanel';

/**
 * The filter panel of an analysis mode on the left, and on the right the panel for the
 * dataset filter (the same for all modes) above the results. The sidebar and the results
 * fill the height of the page, in their own shade of grey.
 */
export function ModePageLayout({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
    const { config, dataset, onDatasetChange } = useWasapLayoutContext();

    return (
        <div className='flex-1 grid-cols-[300px_1fr] lg:grid'>
            <div className='bg-stone-200 p-6'>{sidebar}</div>
            <div className='flex min-w-0 flex-col'>
                <DatasetFilterPanel config={config} value={dataset} onChange={onDatasetChange} />
                <div className='flex-1 space-y-4 bg-stone-50 p-6'>{children}</div>
            </div>
        </div>
    );
}
