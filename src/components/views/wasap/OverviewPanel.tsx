import { type ReactElement, type ReactNode } from 'react';

import Tooltip from '../../dataDisplay/tooltip';

/**
 * A titled box on the overview page, so its plots and tables look alike. With `info`, a help
 * button next to the title shows it on hover.
 */
export function OverviewPanel({ title, info, children }: { title: string; info?: ReactElement; children: ReactNode }) {
    return (
        <div className='border border-stone-300 bg-white p-4'>
            <div className='mb-3 flex items-center gap-2'>
                <h2 className='text-lg font-semibold'>{title}</h2>
                {info !== undefined && (
                    <Tooltip content={info} position='bottom-start'>
                        <button
                            type='button'
                            className='relative top-0.5 flex items-center text-gray-500 hover:text-gray-800'
                            aria-label='What this shows'
                        >
                            <span className='iconify mdi--help-circle-outline text-xl' />
                        </button>
                    </Tooltip>
                )}
            </div>
            {children}
        </div>
    );
}
