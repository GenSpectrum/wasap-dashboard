import { type FC, type ReactNode, type Ref, type RefObject, useRef } from 'react';

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

export const Modal: FC<ModalButtonProps> = (props) => {
    const modalRef = useModalRef();

    return <ButtonWithModalDialog {...props} modalRef={modalRef} />;
};

type ButtonWithModalDialogProps = ModalButtonProps & {
    modalRef: RefObject<HTMLDialogElement | null>;
};

export const ButtonWithModalDialog: FC<ButtonWithModalDialogProps> = ({
    children,
    buttonClassName,
    buttonAriaLabel,
    modalContent,
    modalRef,
    size,
}) => {
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

export function useModalRef() {
    return useRef<HTMLDialogElement>(null);
}

export type ModalProps = {
    modalRef: Ref<HTMLDialogElement>;
    children?: ReactNode;
    size?: keyof typeof modalSize;
};

export const ModalDialog: FC<ModalProps> = ({ children, modalRef, size }) => {
    return (
        <dialog ref={modalRef} className={'modal modal-bottom sm:modal-middle'}>
            <div className={`modal-box ${size !== undefined ? modalSize[size] : 'sm:max-w-5xl'}`}>
                <form method='dialog'>
                    <button className='btn btn-sm btn-circle btn-ghost absolute top-2 right-2'>✕</button>
                </form>
                <div className={'flex flex-col'}>{children}</div>
                <div className='modal-action'>
                    <form method='dialog'>
                        <button className={'float-right mr-2 text-sm underline hover:text-blue-700'}>Close</button>
                    </form>
                </div>
            </div>
            <form method='dialog' className='modal-backdrop'>
                <button>Helper to close when clicked outside</button>
            </form>
        </dialog>
    );
};
