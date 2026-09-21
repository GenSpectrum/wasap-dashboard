import { type ReactNode } from 'react';

import { useWasapLayoutContext } from './WasapLayout';
import { DatasetFilterPanel } from '../../DatasetFilterPanel';

/**
 * The filter panel of an analysis mode on the left, and on the right the panel for the
 * dataset filter (the same for all modes) above the results.
 */
export function ModePageLayout({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
    const { config, dataset, onDatasetChange } = useWasapLayoutContext();

    return (
        <div className='grid-cols-[300px_1fr] gap-x-4 lg:grid'>
            <div className='h-fit p-2 shadow-lg'>{sidebar}</div>
            <div className='min-w-0 space-y-4'>
                <DatasetFilterPanel config={config} value={dataset} onChange={onDatasetChange} />
                {children}
            </div>
        </div>
    );
}
