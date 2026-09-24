/** The columns of the feature bands that the rows can be sorted by. */
export type SortColumn = 'rowLabel' | 'meanProportion' | 'jaccardIndex';
export type SortDirection = 'ascending' | 'descending';
export type FeatureSort = { column: SortColumn; direction: SortDirection };

/** The rows in their natural order: mutations by position, queries as in their collection. */
export const DEFAULT_FEATURE_SORT: FeatureSort = { column: 'rowLabel', direction: 'ascending' };

/**
 * The sort after clicking the header of `column`: the other direction if the rows are already
 * sorted by it, otherwise by it, the row labels in their natural order and values highest first.
 */
export function nextSort(current: FeatureSort, column: SortColumn): FeatureSort {
    if (current.column === column) {
        return { column, direction: current.direction === 'ascending' ? 'descending' : 'ascending' };
    }
    return { column, direction: column === 'rowLabel' ? 'ascending' : 'descending' };
}

export type SortValues = {
    meanProportions: Partial<Record<string, number>>;
    jaccardIndices?: Partial<Record<string, number>>;
};

/**
 * `rowLabels`, given in their natural order, in the order of `sort`. Rows with the same value
 * keep their natural order, and rows without a value go last, in either direction.
 */
export function sortRowLabels(rowLabels: string[], sort: FeatureSort, values: SortValues): string[] {
    if (sort.column === 'rowLabel') {
        return sort.direction === 'ascending' ? rowLabels : [...rowLabels].reverse();
    }
    const valueByRowLabel = (sort.column === 'meanProportion' ? values.meanProportions : values.jaccardIndices) ?? {};
    const sign = sort.direction === 'ascending' ? 1 : -1;
    return [...rowLabels].sort((a, b) => {
        const valueA = valueByRowLabel[a];
        const valueB = valueByRowLabel[b];
        if (valueA === undefined || valueB === undefined) {
            return Number(valueA === undefined) - Number(valueB === undefined);
        }
        return sign * (valueA - valueB);
    });
}
