import { type FC, type ReactNode, type Ref, useRef } from 'react';

const modalSize = {
    large: 'max-w-(--breakpoint-lg)',
};

export type ModalButtonProps = {
    buttonClassName?: string;
    buttonAriaLabel?: string;
    modalContent: ReactNode;
    children?: ReactNode;
    size?: keyof typeof modalSize;
};

export const Modal: FC<ModalButtonProps> = ({ children, buttonClassName, buttonAriaLabel, modalContent, size }) => {
    const modalRef = useRef<HTMLDialogElement>(null);

    return (
        <>
            <button
                type='button'
                className={buttonClassName}
                aria-label={buttonAriaLabel}
                onClick={() => modalRef.current?.showModal()}
            >
                {children}
            </button>
            <ModalDialog modalRef={modalRef} size={size}>
                {modalContent}
            </ModalDialog>
        </>
    );
};

type ModalProps = {
    modalRef: Ref<HTMLDialogElement>;
    children?: ReactNode;
    size?: keyof typeof modalSize;
};

const ModalDialog: FC<ModalProps> = ({ children, modalRef, size }) => {
    return (
        <dialog ref={modalRef} className={'modal modal-bottom sm:modal-middle'}>
            <div className={`modal-box ${size !== undefined ? modalSize[size] : 'sm:max-w-5xl'}`}>
                <form method='dialog'>
                    <button className='btn btn-sm btn-square btn-ghost absolute top-2 right-2'>✕</button>
                </form>
                <div className={'flex flex-col'}>{children}</div>
                <div className='modal-action'>
                    <form method='dialog'>
                        <button className={'hover:text-brand-700 float-right mr-2 text-sm underline'}>Close</button>
                    </form>
                </div>
            </div>
            <form method='dialog' className='modal-backdrop'>
                <button>Helper to close when clicked outside</button>
            </form>
        </dialog>
    );
};
