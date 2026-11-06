import { useId, type ReactNode } from 'react';

import { type useDraftDropdown } from './useDraftDropdown';

type DraftDropdown = Pick<
    ReturnType<typeof useDraftDropdown<unknown>>,
    'isOpen' | 'toggle' | 'rootRef' | 'buttonRef' | 'onBlur'
>;

/**
 * A dropdown in a cell of a bar (like the dataset bar): a button that fills the cell, without a border of its own,
 * as the cell's borders are its edges, and a menu below it while open. The button shows `summary` after `icon`, and
 * says what it is (`label`) to screen readers only.
 */
export function CellDropdown({
    dropdown,
    label,
    icon,
    summary,
    menuClassName,
    onOpen,
    children,
}: {
    /** From `useDraftDropdown`: when it's open, and the draft applied when it closes. */
    dropdown: DraftDropdown;
    label: string;
    /** An iconify class, e.g. `mdi--map-marker-outline`. */
    icon: string;
    summary: ReactNode;
    /** The menu's width and where it is anchored, on top of its box. */
    menuClassName: string;
    onOpen?: () => void;
    /** The menu. */
    children: ReactNode;
}) {
    const { isOpen } = dropdown;
    const menuId = useId();

    return (
        <div ref={dropdown.rootRef} className='relative h-full w-full' onBlur={dropdown.onBlur}>
            <button
                ref={dropdown.buttonRef}
                type='button'
                className='input flex h-full w-full min-w-32 cursor-pointer items-center gap-2 border-transparent text-left'
                aria-haspopup='true'
                aria-expanded={isOpen}
                aria-controls={menuId}
                onClick={() => {
                    if (!isOpen) {
                        onOpen?.();
                    }
                    dropdown.toggle();
                }}
            >
                <span aria-hidden className={`iconify shrink-0 text-base text-gray-500 ${icon}`} />
                <span className='sr-only'>{label}: </span>
                {summary}
                <span
                    aria-hidden
                    className={`iconify mx-1 shrink-0 text-xl text-gray-500 ${isOpen ? 'mdi--chevron-up' : 'mdi--chevron-down'}`}
                />
            </button>
            {isOpen && (
                <div
                    id={menuId}
                    className={`absolute z-10 mt-1 border border-gray-200 bg-white shadow-sm ${menuClassName}`}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

/** What stands in for a `CellDropdown` while its options load: a spinner without a box of its own, in the cell's. */
export function CellDropdownLoading() {
    return (
        <div aria-label='Loading' className='flex h-full items-center justify-center'>
            <div className='loading loading-spinner loading-sm text-neutral-500' />
        </div>
    );
}
