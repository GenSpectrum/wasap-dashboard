import { useCombobox, useMultipleSelection } from 'downshift';
import { type FC, useContext, useEffect, useMemo, useState } from 'react';
import z from 'zod';

import { getExampleMutation } from './ExampleMutation';
import { MutationFilterInfo } from './mutation-filter-info';
import { parseAndValidateMutation } from './parseAndValidateMutation';
import { type ReferenceGenome } from '../../../externalData/lapisApi/ReferenceGenome';
import {
    type MutationsFilter,
    mutationsFilterSchema,
    mutationType,
    mutationTypeSchema,
    type MutationType,
} from '../../../types/dashboardComponents';
import { type DeletionClass, type InsertionClass, type SubstitutionClass } from '../../../util/mutations';
import { ReferenceGenomeContext } from '../../ReferenceGenomeContext';
import { ReferenceGenomesAwaiter } from '../../shared/ReferenceGenomesAwaiter';
import { singleGraphColorRGBByName } from '../../shared/charts/colors';
import { ErrorBoundary } from '../../shared/error-boundary';
import { UserFacingError } from '../../shared/error-display';

const mutationFilterInnerPropsSchema = z.object({
    initialValue: z.union([mutationsFilterSchema.optional(), z.array(z.string()), z.undefined()]),
    enabledMutationTypes: z.array(mutationTypeSchema).optional(),
});

const mutationFilterPropsSchema = mutationFilterInnerPropsSchema.extend({
    width: z.string(),
});

export type MutationFilterInnerProps = z.infer<typeof mutationFilterInnerPropsSchema> & {
    onMutationChange?: (mutationFilter: MutationsFilter | undefined) => void;
};
export type MutationFilterProps = Omit<z.infer<typeof mutationFilterPropsSchema>, 'width'> & {
    width?: string;
    onMutationChange?: (mutationFilter: MutationsFilter | undefined) => void;
};

type SelectedNucleotideMutation = {
    type: typeof mutationType.nucleotideMutations;
    value: SubstitutionClass | DeletionClass;
};

type SelectedAminoAcidMutation = {
    type: typeof mutationType.aminoAcidMutations;
    value: SubstitutionClass | DeletionClass;
};

type SelectedNucleotideInsertion = {
    type: typeof mutationType.nucleotideInsertions;
    value: InsertionClass;
};

type SelectedAminoAcidInsertion = {
    type: typeof mutationType.aminoAcidInsertions;
    value: InsertionClass;
};

export type MutationFilterItem =
    SelectedNucleotideMutation | SelectedAminoAcidMutation | SelectedNucleotideInsertion | SelectedAminoAcidInsertion;

// width default reproduces the old gs-mutation-filter Lit component's @property field initializer.
export const MutationFilter: FC<MutationFilterProps> = ({
    width = '100%',
    initialValue,
    enabledMutationTypes,
    onMutationChange,
}) => {
    const validatedProps = { width, initialValue, enabledMutationTypes };
    return (
        // This was a <label> wrapping the whole thing, unlabeled by a `for`/`id` pair. Behind a
        // shadow-DOM custom element that was inert — a <label> only implicitly associates with a
        // control that's its light-DOM descendant, and the shadow boundary excluded the combobox
        // inside from that. Without shadow DOM, the wrap silently became a real (and wrong) implicit
        // label on the combobox, which is why it — not the "Mutations" text — picked up "Mutations" as
        // its accessible name, and other pages' controls started colliding with it in
        // accessible-name-based test/a11y-tooling queries. A plain <div> (same daisyUI classes, purely
        // visual) restores "not actually a label" instead of "accidentally the wrong one".
        <div className='form-control'>
            <div className='label'>
                <span className='label-text'>Mutations</span>
            </div>
            <ReferenceGenomesAwaiter>
                <ErrorBoundary
                    size={{ height: '40px', width }}
                    layout='horizontal'
                    schema={mutationFilterPropsSchema}
                    componentProps={validatedProps}
                >
                    <div style={{ width }}>
                        <MutationFilterInner
                            initialValue={initialValue}
                            enabledMutationTypes={enabledMutationTypes}
                            onMutationChange={onMutationChange}
                        />
                    </div>
                </ErrorBoundary>
            </ReferenceGenomesAwaiter>
        </div>
    );
};

function MutationFilterInner({
    initialValue,
    enabledMutationTypes = Object.values(mutationType),
    onMutationChange,
}: MutationFilterInnerProps) {
    const referenceGenome = useContext(ReferenceGenomeContext);
    const [inputValue, setInputValue] = useState('');

    const initialState = useMemo(() => {
        return getInitialState(initialValue, referenceGenome, enabledMutationTypes);
    }, [initialValue, referenceGenome, enabledMutationTypes]);

    const [selectedItems, setSelectedItems] = useState<MutationFilterItem[]>(initialState);
    const [itemCandidate, setItemCandidate] = useState<MutationFilterItem | null>(null);
    const [showErrorIndicator, setShowErrorIndicator] = useState(false);

    const items = itemCandidate ? [itemCandidate] : [];

    useEffect(() => {
        setSelectedItems((prevSelectedItems) =>
            prevSelectedItems.filter((mutFilterItem) => enabledMutationTypes.includes(mutFilterItem.type)),
        );
        // `selectedItems` is deliberately not a dependency: the functional updater above always
        // reads the current value. Including it would create the exact infinite loop this fixes
        // — Array.prototype.filter returns a new array reference even when nothing was removed,
        // so setSelectedItems always changes `selectedItems`' identity, which would immediately
        // re-trigger this effect if it were listed here.
    }, [enabledMutationTypes]);

    const handleSelectedItemsChanged = (newSelectedItems: MutationFilterItem[]) => {
        onMutationChange?.(mapToMutationFilterStrings(newSelectedItems));
        setSelectedItems(newSelectedItems);
    };

    const handleNewSelectedItem = (selectedItem: MutationFilterItem | null | undefined) => {
        if (selectedItem) {
            handleSelectedItemsChanged([...selectedItems, selectedItem]);
            setInputValue('');
            setItemCandidate(null);
            setShowErrorIndicator(false);
        }
    };

    const handleInputChange = (newInputValue: string | undefined) => {
        setShowErrorIndicator(false);
        if (newInputValue?.includes(',')) {
            const values = newInputValue.split(',').map((value) => {
                return { value, parsedValue: parseAndValidateMutation(value.trim(), referenceGenome) };
            });

            const validEntries: MutationFilterItem[] = [];
            const rejected: string[] = [];

            for (const v of values) {
                if (v.parsedValue === null) {
                    rejected.push(v.value.trim());
                } else if (enabledMutationTypes.includes(v.parsedValue.type)) {
                    validEntries.push(v.parsedValue);
                } else {
                    rejected.push(v.parsedValue.value.code);
                }
            }

            const selectedItemCandidates = [...selectedItems, ...validEntries];

            handleSelectedItemsChanged(extractUniqueValues(selectedItemCandidates));
            setInputValue(rejected.join(','));
            setItemCandidate(null);
        } else {
            setInputValue(newInputValue ?? '');
            if (newInputValue !== undefined) {
                const candidate = parseAndValidateMutation(newInputValue, referenceGenome);
                const alreadyExists = selectedItems.find(
                    (selectedItem) => selectedItem.value.code === candidate?.value.code,
                );
                const allowedType = candidate !== null && enabledMutationTypes.includes(candidate.type);
                if (!alreadyExists && allowedType) {
                    setItemCandidate(candidate);
                }
            }
        }
    };

    const { getDropdownProps, removeSelectedItem } = useMultipleSelection({
        selectedItems,
        onStateChange({ selectedItems: newSelectedItems, type }) {
            switch (type) {
                case useMultipleSelection.stateChangeTypes.FunctionRemoveSelectedItem:
                    handleSelectedItemsChanged(newSelectedItems ?? []);
                    break;
                default:
                    break;
            }
        },
    });

    const { isOpen, getMenuProps, getInputProps, highlightedIndex, getItemProps, selectedItem } = useCombobox({
        items,
        itemToString(item: MutationFilterItem | undefined | null) {
            return item ? item.value.code : '';
        },
        defaultHighlightedIndex: 0,
        inputValue,
        onStateChange({ inputValue: newInputValue, type, selectedItem: newSelectedItem }) {
            switch (type) {
                case useCombobox.stateChangeTypes.InputKeyDownEnter:
                case useCombobox.stateChangeTypes.ItemClick:
                case useCombobox.stateChangeTypes.InputBlur:
                    handleNewSelectedItem(newSelectedItem);
                    break;

                case useCombobox.stateChangeTypes.InputChange: {
                    handleInputChange(newInputValue);
                    break;
                }
                default:
                    break;
            }
        },
    });

    if (referenceGenome.nucleotideSequences.length === 0 && referenceGenome.genes.length === 0) {
        throw new UserFacingError(
            'No reference sequences available',
            'This organism has neither nucleotide nor amino acid sequences configured in its reference genome. You cannot filter by mutations.',
        );
    }

    return (
        <div className='w-full'>
            <div className={`input flex h-fit w-full flex-wrap gap-x-1 p-1 ${showErrorIndicator ? 'input-error' : ''}`}>
                {selectedItems.map((selectedItemForRender, index) => {
                    return (
                        <div className='my-1' key={`selected-item-${index}`}>
                            <SelectedFilter
                                handleRemoveValue={() => {
                                    removeSelectedItem(selectedItemForRender);
                                }}
                                mutationFilter={selectedItemForRender}
                            />
                        </div>
                    );
                })}
                <div className='flex grow gap-0.5 p-1'>
                    <input
                        placeholder={getPlaceholder(referenceGenome, enabledMutationTypes)}
                        className='w-full min-w-8 focus:outline-none'
                        {...getInputProps(getDropdownProps({ preventKeyAction: isOpen }))}
                        onBlur={() => {
                            setShowErrorIndicator(inputValue !== '');
                        }}
                        size={10}
                    />
                    <MutationFilterInfo />
                </div>
            </div>
            <ul
                className={`w-inherit absolute z-10 mt-1 max-h-80 overflow-scroll bg-white p-0 shadow-md ${
                    !isOpen && 'hidden'
                }`}
                {...getMenuProps()}
            >
                {items.map((item, index) => (
                    <li
                        className={`${highlightedIndex === index && 'bg-blue-300'} ${selectedItem === item && 'font-bold'} flex cursor-pointer flex-col px-3 py-2 shadow-sm`}
                        key={`${item.value.code}${index}`}
                        {...getItemProps({ item, index })}
                        style={{
                            backgroundColor: backgroundColorMap(item, highlightedIndex === index ? 0.4 : 0.2),
                        }}
                    >
                        <span>{item.value.code}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function extractUniqueValues(newSelectedItems: MutationFilterItem[]) {
    const uniqueMutationsMap = new Map<string, MutationFilterItem>();
    for (const mutation of newSelectedItems) {
        if (!uniqueMutationsMap.has(mutation.value.code)) {
            uniqueMutationsMap.set(mutation.value.code, mutation);
        }
    }

    return Array.from(uniqueMutationsMap.values());
}

function getInitialState(
    initialValue: MutationsFilter | string[] | undefined,
    referenceGenome: ReferenceGenome,
    enabledMutationTypes: MutationType[],
) {
    if (initialValue === undefined) {
        return [];
    }

    const values = Array.isArray(initialValue) ? initialValue : Object.values(initialValue).flatMap((it) => it);

    return values
        .map((value) => parseAndValidateMutation(value, referenceGenome))
        .filter((parsedMutation): parsedMutation is MutationFilterItem => parsedMutation !== null)
        .filter((mutation) => enabledMutationTypes.includes(mutation.type));
}

function getPlaceholder(referenceGenome: ReferenceGenome, enabledMutationTypes: MutationType[]) {
    const exampleMutationList = [];

    if (enabledMutationTypes.includes(mutationType.nucleotideMutations)) {
        exampleMutationList.push(getExampleMutation(referenceGenome, 'nucleotide', 'substitution'));
    }
    if (enabledMutationTypes.includes(mutationType.nucleotideInsertions)) {
        exampleMutationList.push(getExampleMutation(referenceGenome, 'nucleotide', 'insertion'));
    }
    if (enabledMutationTypes.includes(mutationType.aminoAcidMutations)) {
        exampleMutationList.push(getExampleMutation(referenceGenome, 'amino acid', 'substitution'));
    }
    if (enabledMutationTypes.includes(mutationType.aminoAcidInsertions)) {
        exampleMutationList.push(getExampleMutation(referenceGenome, 'amino acid', 'insertion'));
    }

    const exampleMutations = exampleMutationList.filter((example) => example !== '').join(', ');

    return `Enter a mutation (e.g. ${exampleMutations})`;
}

const backgroundColorMap = (data: MutationFilterItem, alpha: number = 0.4) => {
    switch (data.type) {
        case mutationType.nucleotideMutations:
            return singleGraphColorRGBByName('green', alpha);
        case mutationType.aminoAcidMutations:
            return singleGraphColorRGBByName('teal', alpha);
        case mutationType.nucleotideInsertions:
            return singleGraphColorRGBByName('indigo', alpha);
        case mutationType.aminoAcidInsertions:
            return singleGraphColorRGBByName('purple', alpha);
    }
};

type SelectedFilterProps = {
    handleRemoveValue: (mutation: MutationFilterItem) => void;
    mutationFilter: MutationFilterItem;
};

const SelectedFilter = ({ handleRemoveValue, mutationFilter }: SelectedFilterProps) => {
    return (
        <span
            key={mutationFilter.value.toString()}
            className='center inline-flex rounded-md px-2 py-1 text-black'
            style={{
                backgroundColor: backgroundColorMap(mutationFilter),
            }}
        >
            {mutationFilter.value.toString()}
            <button
                className='ml-1 cursor-pointer'
                aria-label={`remove mutation filter ${mutationFilter.value.code}`}
                onClick={() => handleRemoveValue(mutationFilter)}
            >
                ×
            </button>
        </span>
    );
};

function mapToMutationFilterStrings(selectedFilters: MutationFilterItem[]) {
    return selectedFilters.reduce<MutationsFilter>(
        (acc, filter) => {
            switch (filter.type) {
                case mutationType.nucleotideMutations:
                    return { ...acc, nucleotideMutations: [...acc.nucleotideMutations, filter.value.toString()] };
                case mutationType.aminoAcidMutations:
                    return { ...acc, aminoAcidMutations: [...acc.aminoAcidMutations, filter.value.toString()] };
                case mutationType.nucleotideInsertions:
                    return { ...acc, nucleotideInsertions: [...acc.nucleotideInsertions, filter.value.toString()] };
                case mutationType.aminoAcidInsertions:
                    return { ...acc, aminoAcidInsertions: [...acc.aminoAcidInsertions, filter.value.toString()] };
            }
        },
        {
            aminoAcidMutations: [],
            nucleotideMutations: [],
            aminoAcidInsertions: [],
            nucleotideInsertions: [],
        },
    );
}
