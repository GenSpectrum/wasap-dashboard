import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { useStringFieldOptions } from '../../dataLayer/hooks/lookups/stringFieldOptions';
import { ErrorBoundary } from '../ui/error-boundary';
import { LoadingDisplay } from '../ui/loading-display';

export type LocationMultiSelectProps = {
    /** The column whose values are offered. */
    field: string;
    /** The ticked locations. Empty means all of them, and says so. */
    value: string[];
    onChange: (value: string[]) => void;
};

/**
 * A dropdown of all locations with a checkbox each, a search field and "Clear".
 * The ticks are applied when the dropdown closes, so that picking several locations reads them from
 * RhyDB once, not once per tick. Nothing ticked means every location, which the button shows
 * as "All locations", so that an empty selection is never mistaken for none.
 */
export function LocationMultiSelect(props: LocationMultiSelectProps) {
    return (
        <ErrorBoundary layout='horizontal' resetKeys={[props.field]}>
            <div className='h-12'>
                <LocationMultiSelectWithoutErrors {...props} />
            </div>
        </ErrorBoundary>
    );
}

function LocationMultiSelectWithoutErrors({ field, value, onChange }: LocationMultiSelectProps) {
    const { data, error, isLoading } = useStringFieldOptions(field);

    if (isLoading) {
        return <LoadingDisplay />;
    }

    if (error !== null) {
        throw error;
    }

    return <LocationDropdown options={data ?? []} value={value} onChange={onChange} />;
}

function LocationDropdown({
    options,
    value,
    onChange,
}: {
    options: { name: string; count: number }[];
    value: string[];
    onChange: (value: string[]) => void;
}) {
    // The ticks while the dropdown is open, `undefined` while it is closed.
    const [draft, setDraft] = useState<string[]>();
    const isOpen = draft !== undefined;
    const [search, setSearch] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuId = useId();

    const close = () => {
        if (draft === undefined) {
            return;
        }
        setDraft(undefined);
        setSearch('');
        if (draft.length !== value.length || draft.some((name, index) => name !== value[index])) {
            onChange(draft);
        }
    };

    // The listeners below are added once per opening, but have to apply the current draft.
    const closeRef = useRef(close);
    closeRef.current = close;
    useEffect(() => {
        if (!isOpen) {
            return;
        }
        const closeOnOutsideClick = (event: PointerEvent) => {
            if (rootRef.current?.contains(event.target as Node) !== true) {
                closeRef.current();
            }
        };
        // On the document, not the dropdown: "Clear" disables itself, which leaves the focus nowhere.
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

    const shown = draft ?? value;
    const selected = useMemo(() => new Set(shown), [shown]);
    const visibleOptions = useMemo(() => {
        const term = search.trim().toLowerCase();
        return term === '' ? options : options.filter((option) => option.name.toLowerCase().includes(term));
    }, [options, search]);

    // In the order of the options, so that the URL doesn't depend on the order of the clicks.
    const change = (names: Set<string>) => setDraft(options.map(({ name }) => name).filter((name) => names.has(name)));

    const toggle = (name: string) => {
        const next = new Set(selected);
        if (!next.delete(name)) {
            next.add(name);
        }
        change(next);
    };

    return (
        <div
            ref={rootRef}
            className='relative w-full'
            onBlur={(event) => {
                // Tabbing out of the dropdown; a click outside is handled above.
                if (event.relatedTarget !== null && !event.currentTarget.contains(event.relatedTarget)) {
                    close();
                }
            }}
        >
            <button
                ref={buttonRef}
                type='button'
                className='input flex w-full min-w-32 cursor-pointer items-center gap-2 text-left'
                aria-haspopup='true'
                aria-expanded={isOpen}
                aria-controls={menuId}
                onClick={() => (isOpen ? close() : setDraft(value))}
            >
                <SelectionSummary value={shown} />
                <span aria-hidden className='px-2'>
                    {isOpen ? '↑' : '↓'}
                </span>
            </button>
            {isOpen && (
                <div
                    id={menuId}
                    className='absolute z-10 mt-1 w-full min-w-64 border border-gray-200 bg-white shadow-sm'
                >
                    <div className='flex items-center gap-2 border-b border-gray-100 p-2'>
                        <input
                            className='input input-sm min-w-0 grow'
                            placeholder='Search locations'
                            aria-label='Search locations'
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            autoFocus
                        />
                        <button
                            type='button'
                            className='btn btn-ghost btn-xs'
                            onClick={() => setDraft([])}
                            disabled={shown.length === 0}
                        >
                            Clear
                        </button>
                    </div>
                    <ul aria-label='Locations' className='max-h-80 overflow-y-auto'>
                        {visibleOptions.length === 0 ? (
                            <li className='px-3 py-2 text-gray-500'>No matching locations.</li>
                        ) : (
                            visibleOptions.map((option) => (
                                <li key={option.name} className='border-b border-gray-100 last:border-b-0'>
                                    <label className='flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50'>
                                        <input
                                            type='checkbox'
                                            className='checkbox checkbox-sm'
                                            checked={selected.has(option.name)}
                                            onChange={() => toggle(option.name)}
                                        />
                                        <span>{option.name}</span>
                                        <span className='text-gray-500'>({option.count.toLocaleString('en-US')})</span>
                                    </label>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

/** The selection, in as much as fits the button: "All locations", one name, or names with a count. */
function SelectionSummary({ value }: { value: string[] }) {
    if (value.length === 0) {
        return (
            <span className='grow truncate'>
                All locations <span className='text-gray-500'>(pooled)</span>
            </span>
        );
    }
    return (
        <>
            <span className='grow truncate' title={value.join(', ')}>
                {value.join(', ')}
            </span>
            {value.length > 1 && <span className='badge badge-sm badge-neutral shrink-0'>{value.length}</span>}
        </>
    );
}
