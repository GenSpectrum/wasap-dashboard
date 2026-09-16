import { type ReactNode, type PropsWithChildren } from 'react';

import { Modal } from '../shared/modal';

type SelectorHeadlineProps = PropsWithChildren<{
    info?: ReactNode;
}>;

export function SelectorHeadline({ children, info }: SelectorHeadlineProps) {
    if (info === undefined) {
        return <h1 className='mb-2 font-bold capitalize'>{children}</h1>;
    }

    return (
        <div className='flex flex-row items-baseline justify-between gap-2'>
            <h1 className='mb-2 font-bold capitalize'>{children}</h1>
            <Modal buttonClassName='btn btn-xs' modalContent={info} size='large'>
                ?
            </Modal>
        </div>
    );
}
