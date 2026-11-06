import { useMemo, useState } from 'react';

import { CellDropdown, CellDropdownLoading } from './CellDropdown';
import { useDraftDropdown } from './useDraftDropdown';
import { useRhydbSchema } from '../../dataLayer/hooks/connection';
import { useStringFieldOptions } from '../../dataLayer/hooks/lookups/stringFieldOptions';
import { ErrorBoundary } from '../ui/ErrorBoundary';

export type LocationMultiSelectProps = {
    /** The ticked locations. Empty means all of them, and says so. */
    value: string[];
    onChange: (value: string[]) => void;
    /** What the dropdown is, for screen readers: the button shows only the selection. */
    label: string;
    /** An iconify class for the icon at the start of the button, e.g. `mdi--map-marker-outline`. */
    icon: string;
};

/**
 * A dropdown of all locations with a checkbox each, a search field and "Clear".
 * The ticks are applied when the dropdown closes, so that picking several locations reads them from
 * RhyDB once, not once per tick. Nothing ticked means every location, which the button shows
 * as "All locations", so that an empty selection is never mistaken for none.
 */
export function LocationMultiSelect(props: LocationMultiSelectProps) {
    return (
        <ErrorBoundary layout='horizontal'>
            <div className='h-full'>
                <LocationMultiSelectWithoutErrors {...props} />
            </div>
        </ErrorBoundary>
    );
}

function LocationMultiSelectWithoutErrors(props: LocationMultiSelectProps) {
    const { data, error, isLoading } = useStringFieldOptions(useRhydbSchema().locationName);

    if (isLoading) {
        return <CellDropdownLoading />;
    }

    if (error !== null) {
        throw error;
    }

    return <LocationDropdown options={data ?? []} {...props} />;
}

function LocationDropdown({
    options,
    value,
    onChange,
    label,
    icon,
}: {
    options: { name: string; count: number }[];
} & LocationMultiSelectProps) {
    const dropdown = useDraftDropdown(value, (draft) => {
        if (draft.length !== value.length || draft.some((name, index) => name !== value[index])) {
            onChange(draft);
        }
    });
    const { shown } = dropdown;
    const [search, setSearch] = useState('');

    const selected = useMemo(() => new Set(shown), [shown]);
    const visibleOptions = useMemo(() => {
        const term = search.trim().toLowerCase();
        return term === '' ? options : options.filter((option) => option.name.toLowerCase().includes(term));
    }, [options, search]);

    // In the order of the options, so that the URL doesn't depend on the order of the clicks.
    const change = (names: Set<string>) =>
        dropdown.setDraft(options.map(({ name }) => name).filter((name) => names.has(name)));

    const toggle = (name: string) => {
        const next = new Set(selected);
        if (!next.delete(name)) {
            next.add(name);
        }
        change(next);
    };

    return (
        <CellDropdown
            dropdown={dropdown}
            label={label}
            icon={icon}
            summary={<SelectionSummary value={shown} />}
            menuClassName='w-full min-w-64'
            onOpen={() => setSearch('')}
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
                    onClick={() => dropdown.setDraft([])}
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
        </CellDropdown>
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
