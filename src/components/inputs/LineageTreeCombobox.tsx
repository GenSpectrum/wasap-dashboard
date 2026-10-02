import { useMemo } from 'react';

import { DownshiftCombobox, DownshiftMultiCombobox } from './downshift-combobox';
import { type LineageTree } from '../../lineageTree/lineageTree';

type LineageTreeComboboxProps = {
    lineageTree: LineageTree;
    placeholderText?: string;
} & (
    | {
          multiSelect?: false;
          value: string | undefined;
          onChange: (lineage: string | undefined) => void;
      }
    | {
          multiSelect: true;
          value: string[];
          onChange: (lineages: string[]) => void;
      }
);

/**
 * Picks one lineage (or several, with `multiSelect`) of the lineage tree, by its exact name: no
 * wildcards like `BA.2*`, since the lineages of the tree are what is picked.
 */
export function LineageTreeCombobox({ lineageTree, placeholderText, ...selection }: LineageTreeComboboxProps) {
    const lineages = useMemo(() => sortedLineageNames(lineageTree), [lineageTree]);

    // lineages that aren't in the tree (say, from an old URL) aren't shown as selected
    const multiValue = selection.multiSelect === true ? selection.value : undefined;
    const knownMultiValue = useMemo(
        () => multiValue?.filter((lineage) => lineageTree.lineages.has(lineage)) ?? [],
        [multiValue, lineageTree],
    );

    if (selection.multiSelect === true) {
        return (
            <DownshiftMultiCombobox
                allItems={lineages}
                value={knownMultiValue}
                filterItemsByInputValue={matchesInput}
                onChange={selection.onChange}
                itemToString={lineageToString}
                placeholderText={placeholderText ?? 'Select variants'}
                formatItemInList={formatLineage}
                formatSelectedItem={formatLineage}
            />
        );
    }

    const { value, onChange } = selection;
    return (
        <DownshiftCombobox
            allItems={lineages}
            value={value !== undefined && lineageTree.lineages.has(value) ? value : null}
            filterItemsByInputValue={matchesInput}
            onChange={(lineage) => onChange(lineage ?? undefined)}
            itemToString={lineageToString}
            placeholderText={placeholderText ?? 'Select variant'}
            formatItemInList={formatLineage}
        />
    );
}

/** Sorted so that `A.2` comes before `A.10`. */
export function sortedLineageNames(lineageTree: LineageTree): string[] {
    return [...lineageTree.lineages.keys()].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

// module level, so that they stay the same between renders (the comboboxes have them as effect dependencies)
const lineageToString = (lineage: string | undefined | null) => lineage ?? '';
const matchesInput = (lineage: string, input: string) => lineage.toLowerCase().includes(input.toLowerCase());
const formatLineage = (lineage: string) => <span>{lineage}</span>;
