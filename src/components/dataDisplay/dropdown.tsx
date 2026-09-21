import { flip, offset, shift } from '@floating-ui/dom';
import { type Placement } from '@floating-ui/utils';
import { type FC, type ReactNode, useRef, useState } from 'react';

import { useCloseOnClickOutside, useCloseOnEsc, useFloatingUi } from './floating-ui-hooks';

interface DropdownProps {
    /** The text of the button. With an `icon` it's only the tooltip and accessible name of the button. */
    buttonTitle: string;
    /** Shows this (e.g. an iconify `<span>`) in the button instead of the title text. */
    icon?: ReactNode;
    placement?: Placement;
    children?: ReactNode;
}

export const dropdownClass =
    'z-10 absolute w-max top-0 left-0 bg-white p-4 border border-gray-200 shadow-lg rounded-md';

export const Dropdown: FC<DropdownProps> = ({ children, buttonTitle, icon, placement }) => {
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
            <button
                type='button'
                className={`btn btn-xs whitespace-nowrap ${icon === undefined ? 'w-full' : ''}`}
                onClick={toggle}
                ref={referenceRef}
                {...(icon !== undefined && { 'aria-label': buttonTitle, title: buttonTitle })}
            >
                {icon ?? <span className={'w-full truncate'}>{buttonTitle}</span>}
            </button>
            <div ref={floatingRef} className={`${dropdownClass} ${showContent ? '' : 'hidden'}`}>
                {children}
            </div>
        </>
    );
};
