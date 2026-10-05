import { type ReactElement, type ReactNode } from 'react';

import Tooltip from '../dataDisplay/tooltip';

/**
 * A box around a plot or table with its title above it, so that they look alike across the pages.
 * With `info`, a help button next to the title shows it on hover. `flush` drops the box's padding,
 * for content that should reach its border, such as a table with row lines.
 */
export function TitledPanel({
    title,
    info,
    flush = false,
    children,
}: {
    title: string;
    info?: ReactElement;
    flush?: boolean;
    children: ReactNode;
}) {
    return (
        <section>
            <div className='mb-2 flex items-center gap-2'>
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
            <div className={`border border-stone-300 bg-white ${flush ? '' : 'p-4'}`}>{children}</div>
        </section>
    );
}
