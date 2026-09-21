import { useCombobox, useMultipleSelection } from 'downshift';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { DeleteIcon } from '../shared/icons/DeleteIcon';

export function DownshiftCombobox<Item>({
    allItems,
    value,
    filterItemsByInputValue,
    onChange,
    itemToString,
    placeholderText,
    formatItemInList,
    inputClassName = '',
}: {
    allItems: Item[];
    value: Item | null;
    filterItemsByInputValue: (item: Item, value: string) => boolean;
    onChange: (item: Item | null) => void;
    itemToString: (item: Item | undefined | null) => string;
    placeholderText?: string;
    formatItemInList: (item: Item) => ReactNode;
    inputClassName?: string;
}) {
    const [selectedItem, setSelectedItem] = useState<Item | null>(() => value);
    const [itemsFilter, setItemsFilter] = useState(() => itemToString(selectedItem));

    useEffect(() => {
        setSelectedItem(value);
        setItemsFilter(itemToString(value));
    }, [itemToString, value]);

    const items = useMemo(
        () => allItems.filter((item) => filterItemsByInputValue(item, itemsFilter)),
        [allItems, filterItemsByInputValue, itemsFilter],
    );
    const [inputIsInvalid, setInputIsInvalid] = useState(false);

    const selectItem = (item: Item | null) => {
        setSelectedItem(item);
        onChange(item);
    };

    const {
        isOpen,
        getToggleButtonProps,
        getMenuProps,
        getInputProps,
        highlightedIndex,
        getItemProps,
        inputValue,
        closeMenu,
        reset,
    } = useCombobox({
        onInputValueChange({ inputValue }) {
            setInputIsInvalid(false);
            setItemsFilter(inputValue.trim());
        },
        onSelectedItemChange({ selectedItem }) {
            selectItem(selectedItem);
        },
        items,
        itemToString(item) {
            return itemToString(item);
        },
        selectedItem,
    });

    const onInputBlur = () => {
        if (inputValue === '') {
            selectItem(null);
            return;
        }

        const trimmedInput = inputValue.trim();
        const matchingItem = items.find((item) => itemToString(item) === trimmedInput);
        if (matchingItem !== undefined) {
            selectItem(matchingItem);
            return;
        }

        setInputIsInvalid(true);
    };

    const clearInput = () => {
        reset();
    };

    const buttonRef = useRef(null);

    return (
        <div className={'relative w-full'}>
            <div className='flex w-full flex-col gap-1'>
                <div
                    className={`input flex w-full min-w-32 gap-0.5 ${inputClassName} ${inputIsInvalid ? 'input-error' : ''}`}
                    onBlur={(event) => {
                        // Clicking the toggle button moves focus back to the input right
                        // after (so keyboard nav keeps working) - that's a blur-and-refocus
                        // within this same box, not a blur out of it, and must not close
                        // what the click just opened. Only close when focus actually left
                        // for something outside this box entirely.
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                            closeMenu();
                        }
                    }}
                >
                    <input
                        placeholder={placeholderText}
                        className='w-full p-1.5'
                        {...getInputProps()}
                        onBlur={onInputBlur}
                    />
                    <ClearButton onClick={clearInput} isHidden={inputValue === ''} />
                    <ToggleButton isOpen={isOpen} buttonRef={buttonRef} getToggleButtonProps={getToggleButtonProps} />
                </div>
            </div>
            <DropdownMenu
                isOpen={isOpen}
                getMenuProps={getMenuProps}
                items={items}
                highlightedIndex={highlightedIndex}
                getItemProps={getItemProps}
                formatItemInList={formatItemInList}
                itemToString={itemToString}
                selectedItem={selectedItem}
                emptyMessage='No elements to select.'
            />
        </div>
    );
}

export function DownshiftMultiCombobox<Item>({
    allItems,
    value,
    filterItemsByInputValue,
    onChange,
    itemToString,
    placeholderText,
    formatItemInList,
    formatSelectedItem,
    inputClassName = '',
}: {
    allItems: Item[];
    value: Item[];
    filterItemsByInputValue: (item: Item, value: string) => boolean;
    onChange: (items: Item[]) => void;
    itemToString: (item: Item | undefined | null) => string;
    placeholderText?: string;
    formatItemInList: (item: Item) => ReactNode;
    formatSelectedItem?: (item: Item) => ReactNode;
    inputClassName?: string;
}) {
    const [selectedItems, setSelectedItems] = useState<Item[]>(() => value);
    const [itemsFilter, setItemsFilter] = useState('');

    useEffect(() => {
        setSelectedItems(value);
    }, [value]);

    const availableItems = useMemo(() => {
        return allItems.filter((item) => {
            const notAlreadySelected = !selectedItems.find(
                (selectedItem) => itemToString(selectedItem) === itemToString(item),
            );
            const matchesFilter = filterItemsByInputValue(item, itemsFilter);
            return notAlreadySelected && matchesFilter;
        });
    }, [allItems, selectedItems, filterItemsByInputValue, itemsFilter, itemToString]);

    const notifyChange = (items: Item[]) => {
        setSelectedItems(items);
        onChange(items);
    };

    const { getDropdownProps, removeSelectedItem } = useMultipleSelection({
        selectedItems,
        onStateChange({ selectedItems: newSelectedItems, type }) {
            switch (type) {
                case useMultipleSelection.stateChangeTypes.FunctionRemoveSelectedItem:
                    notifyChange(newSelectedItems ?? []);
                    break;
                default:
                    break;
            }
        },
    });

    const {
        isOpen,
        getToggleButtonProps,
        getMenuProps,
        getInputProps,
        highlightedIndex,
        getItemProps,
        closeMenu,
        selectItem,
    } = useCombobox({
        items: availableItems,
        itemToString(item) {
            return itemToString(item);
        },
        inputValue: itemsFilter,
        onStateChange({ inputValue: newInputValue, type, selectedItem: newSelectedItem }) {
            switch (type) {
                case useCombobox.stateChangeTypes.InputKeyDownEnter:
                case useCombobox.stateChangeTypes.ItemClick:
                    if (newSelectedItem) {
                        notifyChange([...selectedItems, newSelectedItem]);
                        setItemsFilter('');
                    }
                    break;
                case useCombobox.stateChangeTypes.InputChange:
                    setItemsFilter(newInputValue?.trim() ?? '');
                    break;
                default:
                    break;
            }
        },
        stateReducer(state, actionAndChanges) {
            const { changes, type } = actionAndChanges;
            switch (type) {
                case useCombobox.stateChangeTypes.InputKeyDownEnter:
                case useCombobox.stateChangeTypes.ItemClick:
                    return {
                        ...changes,
                        isOpen: true,
                        highlightedIndex: state.highlightedIndex,
                        inputValue: '',
                    };
                default:
                    return changes;
            }
        },
    });

    const clearAll = () => {
        notifyChange([]);
        setItemsFilter('');
        selectItem(null);
    };

    const buttonRef = useRef(null);

    return (
        <div className={'relative w-full'}>
            <div className='flex w-full flex-col gap-1'>
                <div
                    className={`input flex h-fit w-full min-w-24 flex-wrap gap-1 p-1.5 ${inputClassName}`}
                    onBlur={(event) => {
                        // See the single-select combobox above: the toggle button moves
                        // focus back to the input right after a click, which must not
                        // read as a blur out of this box.
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                            closeMenu();
                        }
                    }}
                >
                    {selectedItems.map((selectedItem, index) => (
                        <span
                            key={`${itemToString(selectedItem)}-${index}`}
                            className='bg-brand-100 inline-flex items-center gap-1 rounded px-2 py-0.5 text-black'
                        >
                            {formatSelectedItem ? formatSelectedItem(selectedItem) : itemToString(selectedItem)}
                            <button
                                aria-label={`remove ${itemToString(selectedItem)}`}
                                className='cursor-pointer hover:text-red-600'
                                type='button'
                                onClick={() => {
                                    removeSelectedItem(selectedItem);
                                    selectItem(null);
                                }}
                                tabIndex={-1}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                    <div className='flex min-w-32 grow gap-0.5'>
                        <input
                            placeholder={placeholderText}
                            className='w-full min-w-24 px-1 py-0.5 focus:outline-none'
                            {...getInputProps(getDropdownProps({ preventKeyAction: isOpen }))}
                        />
                        <ClearButton onClick={clearAll} isHidden={selectedItems.length === 0} />
                        <ToggleButton
                            isOpen={isOpen}
                            buttonRef={buttonRef}
                            getToggleButtonProps={getToggleButtonProps}
                        />
                    </div>
                </div>
            </div>
            <DropdownMenu
                isOpen={isOpen}
                getMenuProps={getMenuProps}
                items={availableItems}
                highlightedIndex={highlightedIndex}
                getItemProps={getItemProps}
                formatItemInList={formatItemInList}
                itemToString={itemToString}
                selectedItem={selectedItems}
                emptyMessage={selectedItems.length > 0 ? 'No more elements to select.' : 'No elements to select.'}
            />
        </div>
    );
}

function ToggleButton({
    isOpen,
    buttonRef,
    getToggleButtonProps,
    onClick,
}: {
    isOpen: boolean;
    buttonRef?: React.RefObject<HTMLButtonElement | null>;
    getToggleButtonProps?: (options?: { ref?: React.Ref<HTMLButtonElement> }) => Record<string, unknown>;
    onClick?: () => void;
}) {
    // Downshift tracks the toggle button itself via the ref it hands back here
    // (to tell a click on the button apart from an outside click that should
    // close the menu) - passing buttonRef as a plain JSX `ref` below, instead
    // of through here, would silently replace that internal ref and the
    // button would stop opening the menu on click.
    const props = getToggleButtonProps ? getToggleButtonProps({ ref: buttonRef }) : { onClick, ref: buttonRef };
    return (
        <button aria-label='toggle menu' className='px-2' type='button' {...props}>
            {isOpen ? <>↑</> : <>↓</>}
        </button>
    );
}

function ClearButton({ onClick, isHidden }: { onClick: () => void; isHidden: boolean }) {
    return (
        <button
            aria-label='clear selection'
            className={`px-2 ${isHidden ? 'hidden' : ''}`}
            type='button'
            onClick={onClick}
            tabIndex={-1}
        >
            <DeleteIcon />
        </button>
    );
}

function DropdownMenu<Item>({
    isOpen,
    getMenuProps,
    items,
    highlightedIndex,
    getItemProps,
    formatItemInList,
    itemToString,
    selectedItem,
    emptyMessage,
}: {
    isOpen: boolean;
    getMenuProps: () => Record<string, unknown>;
    items: Item[];
    highlightedIndex: number;
    getItemProps: (options: { item: Item; index: number }) => Record<string, unknown>;
    formatItemInList: (item: Item) => ReactNode;
    itemToString: (item: Item) => string;
    selectedItem?: Item | Item[] | null;
    emptyMessage: string;
}) {
    const isItemSelected = (item: Item) => {
        if (Array.isArray(selectedItem)) {
            return selectedItem.some((selected) => itemToString(selected) === itemToString(item));
        }
        return selectedItem !== null && selectedItem !== undefined && itemToString(selectedItem) === itemToString(item);
    };

    return (
        <ul
            className={`absolute z-10 mt-1 max-h-80 w-full min-w-32 overflow-scroll bg-white shadow-md ${isOpen ? '' : 'hidden'}`}
            {...getMenuProps()}
        >
            {items.length > 0 ? (
                items.map((item, index) => (
                    <li
                        className={`${highlightedIndex === index ? 'bg-brand-200' : ''} ${isItemSelected(item) ? 'font-bold' : ''} cursor-pointer px-3 py-2 shadow-xs`}
                        key={itemToString(item)}
                        {...getItemProps({ item, index })}
                    >
                        {formatItemInList(item)}
                    </li>
                ))
            ) : (
                <li className='px-3 py-2 shadow-xs'>{emptyMessage}</li>
            )}
        </ul>
    );
}
