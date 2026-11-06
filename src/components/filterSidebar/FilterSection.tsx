import { useId, type PropsWithChildren, type ReactNode } from 'react';

import { HelpButton } from '../ui/HelpButton';

/**
 * A group of fields in a filter sidebar, under a small uppercase title with a rule after it (like
 * the group labels of the header). The fields keep the same gap among themselves as the sidebar.
 */
export function FilterSection({
    title,
    info,
    children,
}: PropsWithChildren<{
    title: string;
    /** Help shown on hover or focus of a help icon at the end of the title's rule. */
    info?: ReactNode;
}>) {
    const titleId = useId();

    return (
        <section aria-labelledby={titleId}>
            <div className='mb-3 flex items-center gap-2'>
                <h2
                    id={titleId}
                    className='text-xs font-semibold tracking-wide whitespace-nowrap text-gray-500 uppercase'
                >
                    {title}
                </h2>
                <div className='h-px flex-1 bg-stone-300' aria-hidden='true' />
                {info !== undefined && (
                    <HelpButton
                        info={info}
                        ariaLabel={`Show information about ${title}`}
                        size='small'
                        placement='right-start'
                    />
                )}
            </div>
            <div className='flex flex-col gap-4'>{children}</div>
        </section>
    );
}
