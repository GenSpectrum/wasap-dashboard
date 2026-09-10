import { type FC, type ReactNode, useRef, useState } from 'react';
import { flip, offset, shift } from '@floating-ui/dom';
import { type Placement } from '@floating-ui/utils';

import { useCloseOnClickOutside, useCloseOnEsc, useFloatingUi } from './floating-ui/hooks';

interface DropdownProps {
    buttonTitle: string;
    placement?: Placement;
    children?: ReactNode;
}

export const dropdownClass =
    'z-10 absolute w-max top-0 left-0 bg-white p-4 border border-gray-200 shadow-lg rounded-md';

export const Dropdown: FC<DropdownProps> = ({ children, buttonTitle, placement }) => {
    const [showContent, setShowContent] = useState(false);
    const referenceRef = useRef<HTMLButtonElement>(null);
    const floatingRef = useRef<HTMLDivElement>(null);

    useFloatingUi(referenceRef, floatingRef, [offset(4), shift(), flip()], placement);

    useCloseOnClickOutside(floatingRef, referenceRef, setShowContent);
    useCloseOnEsc(setShowContent);

    const toggle = () => {
        setShowContent(!showContent);
    };

    return (
        <>
            <button type='button' className='btn btn-xs whitespace-nowrap w-full' onClick={toggle} ref={referenceRef}>
                <span className={'w-full truncate'}>{buttonTitle}</span>
            </button>
            <div ref={floatingRef} className={`${dropdownClass} ${showContent ? '' : 'hidden'}`}>
                {children}
            </div>
        </>
    );
};
