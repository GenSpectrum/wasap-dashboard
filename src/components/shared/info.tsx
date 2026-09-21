import { type FC, type PropsWithChildren } from 'react';

import { Modal } from './modal';

const Info: FC<PropsWithChildren> = ({ children }) => {
    return (
        <div className='relative inline-flex'>
            <Modal buttonClassName='btn btn-xs' modalContent={children}>
                ?
            </Modal>
        </div>
    );
};

export const InfoHeadline1: FC<PropsWithChildren> = ({ children }) => {
    return <h1 className='text-justify text-lg font-bold'>{children}</h1>;
};

export const InfoHeadline2: FC<PropsWithChildren> = ({ children }) => {
    return <h2 className='mt-4 text-justify text-base font-bold'>{children}</h2>;
};

export const InfoParagraph: FC<PropsWithChildren> = ({ children }) => {
    // A <div>, not a <p>: several callers nest block content (lists, a code block, a
    // form) inside this, which isn't valid inside <p> and made the browser silently
    // close the tag early, breaking the DOM structure React expected.
    return <div className='my-1 text-justify text-base font-normal text-wrap'>{children}</div>;
};

export default Info;
