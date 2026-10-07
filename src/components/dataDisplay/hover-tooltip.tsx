import { flip, offset, shift } from '@floating-ui/dom';
import { type Placement } from '@floating-ui/utils';
import { useRef, useState, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from 'react';

import { useCloseOnEsc, useFloatingUi } from './floating-ui-hooks';

export const TOOLTIP_BASE_STYLES = 'z-10 w-max bg-white p-4 border border-gray-200';

const TOOLTIP_MIDDLEWARE = [offset(4), flip(), shift({ padding: 8 })];

/**
 * Shows `content` next to the children while the mouse is over them or the focus is in them.
 * The content is only rendered while it is shown. It is positioned `fixed`, so a container that
 * scrolls or clips its overflow doesn't cut it off, and moved back into view at the edge of the
 * window. With `focusable`, the children can be focused themselves (for children without anything
 * focusable in them, such as plain text).
 */
export function HoverTooltip({
    content,
    placement = 'bottom',
    focusable = false,
    className,
    children,
}: {
    content: ReactNode;
    placement?: Placement;
    focusable?: boolean;
    className?: string;
    children: ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const referenceRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={referenceRef}
            className={className}
            tabIndex={focusable ? 0 : undefined}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
        >
            {children}
            {isOpen && (
                <OpenTooltip referenceRef={referenceRef} placement={placement} setIsOpen={setIsOpen}>
                    {content}
                </OpenTooltip>
            )}
        </div>
    );
}

/** Listens for Escape only while open, as there can be many closed ones on a page. */
function OpenTooltip({
    setIsOpen,
    ...props
}: Parameters<typeof FloatingTooltip>[0] & { setIsOpen: Dispatch<SetStateAction<boolean>> }) {
    useCloseOnEsc(setIsOpen);
    return <FloatingTooltip {...props} />;
}

/** A tooltip box next to `referenceRef`. Render it only while it is shown. */
export function FloatingTooltip({
    referenceRef,
    placement,
    className = '',
    children,
}: {
    referenceRef: RefObject<HTMLElement | null>;
    placement: Placement;
    className?: string;
    children: ReactNode;
}) {
    const floatingRef = useRef<HTMLDivElement>(null);
    useFloatingUi(referenceRef, floatingRef, TOOLTIP_MIDDLEWARE, placement, 'fixed');
    return (
        <div ref={floatingRef} role='tooltip' className={`fixed top-0 left-0 ${TOOLTIP_BASE_STYLES} ${className}`}>
            {children}
        </div>
    );
}
