import { useEffect, useRef, useState, type FocusEvent } from 'react';

/**
 * A dropdown that edits a draft of `value` while it is open, and hands the draft to `apply` when it closes:
 * on a click outside, Escape, tabbing out of it, or `close()`. So that a change that takes several steps
 * (ticking several locations, setting both ends of a date range) is applied once, when it is complete.
 *
 * Put `rootRef` and `onBlur` on the element around the button and the dropdown, `buttonRef` on the button.
 */
export function useDraftDropdown<T>(value: T, apply: (draft: T) => void) {
    // The draft while the dropdown is open, `undefined` while it is closed. Boxed, as `T` may include `undefined`.
    const [box, setBox] = useState<{ draft: T }>();
    // The same, but current right away: a field that commits its input on blur does so just before closing.
    const boxRef = useRef<{ draft: T }>(undefined);
    const isOpen = box !== undefined;
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const setDraftBox = (next: { draft: T } | undefined) => {
        boxRef.current = next;
        setBox(next);
    };

    const close = () => {
        const current = boxRef.current;
        if (current === undefined) {
            return;
        }
        setDraftBox(undefined);
        apply(current.draft);
    };

    // The listeners below are added once per opening, but have to apply with the current `apply`.
    const closeRef = useRef(close);
    closeRef.current = close;
    useEffect(() => {
        if (!isOpen) {
            return;
        }
        const closeOnOutsideClick = (event: PointerEvent) => {
            if (rootRef.current?.contains(event.target as Node) !== true) {
                // Lets a field in the dropdown commit what was typed into it (e.g. a date) first.
                if (
                    document.activeElement instanceof HTMLElement &&
                    rootRef.current?.contains(document.activeElement)
                ) {
                    document.activeElement.blur();
                }
                closeRef.current();
            }
        };
        // On the document, not the dropdown: a button in it that disables itself leaves the focus nowhere.
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeRef.current();
                buttonRef.current?.focus();
            }
        };
        document.addEventListener('pointerdown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isOpen]);

    return {
        isOpen,
        /** The draft while open, else `value`: what the button and the dropdown show. */
        shown: box !== undefined ? box.draft : value,
        setDraft: (draft: T) => setDraftBox({ draft }),
        close,
        toggle: () => (isOpen ? close() : setDraftBox({ draft: value })),
        rootRef,
        buttonRef,
        onBlur: (event: FocusEvent<HTMLElement>) => {
            // Tabbing out of the dropdown; a click outside is handled above.
            if (event.relatedTarget !== null && !event.currentTarget.contains(event.relatedTarget)) {
                close();
            }
        },
    };
}
