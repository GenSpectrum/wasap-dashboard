import { type ReactNode, type PropsWithChildren } from 'react';

import { HelpButton } from '../../ui/HelpButton';

type SelectorHeadlineProps = PropsWithChildren<{
    /** Help shown on hover or focus of a help icon next to the headline. */
    info?: ReactNode;
    /** Long help, opened in a large dialog by a click on the help icon (instead of `info`). */
    infoModal?: ReactNode;
}>;

export function SelectorHeadline({ children, info, infoModal }: SelectorHeadlineProps) {
    if (info === undefined && infoModal === undefined) {
        return <h1 className='mb-2 font-bold capitalize'>{children}</h1>;
    }

    return (
        <div className='mb-2 flex flex-row items-center justify-between gap-2'>
            <h1 className='font-bold capitalize'>{children}</h1>
            <HelpButton
                info={info}
                infoModal={infoModal}
                ariaLabel={`Show information about ${typeof children === 'string' ? children : 'this'}`}
                size='small'
                placement='right-start'
            />
        </div>
    );
}
