import { type ReactNode, type PropsWithChildren } from 'react';

import { HelpButton } from '../../ui/HelpButton';

type SelectorHeadlineProps = PropsWithChildren<{
    /** Help shown on hover or focus of a help icon next to the headline. */
    info?: ReactNode;
}>;

export function SelectorHeadline({ children, info }: SelectorHeadlineProps) {
    if (info === undefined) {
        return <h1 className='mb-2 font-bold capitalize'>{children}</h1>;
    }

    return (
        <div className='mb-2 flex flex-row items-center justify-between gap-2'>
            <h1 className='font-bold capitalize'>{children}</h1>
            <HelpButton
                info={info}
                ariaLabel={`Show information about ${typeof children === 'string' ? children : 'this'}`}
                size='small'
                placement='right-start'
            />
        </div>
    );
}
