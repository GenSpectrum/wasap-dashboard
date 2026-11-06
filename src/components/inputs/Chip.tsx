import type { ReactNode } from 'react';

/** A picked value in a multi-value field (lineages, positions), with a button to remove it. */
export function Chip({
    children,
    removeLabel,
    onRemove,
    removeTabIndex,
}: {
    children: ReactNode;
    /** The accessible name of the remove button, e.g. `remove position 501`. */
    removeLabel: string;
    onRemove: () => void;
    /** -1 where the field removes chips from the keyboard itself (Backspace), like the comboboxes. */
    removeTabIndex?: number;
}) {
    return (
        <span className='bg-brand-100 inline-flex items-center gap-1 px-2 py-0.5 text-black'>
            {children}
            <button
                aria-label={removeLabel}
                className='flex cursor-pointer items-center text-gray-600 hover:text-black'
                type='button'
                onClick={onRemove}
                tabIndex={removeTabIndex}
            >
                <span className='iconify mdi--close text-sm' />
            </button>
        </span>
    );
}
