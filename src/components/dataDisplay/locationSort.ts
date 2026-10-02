import { type LocationOverview } from '../../dataLayer/queries';

/** The columns of the overview page's location table that its rows can be sorted by. */
export type LocationSortColumn = 'name' | 'sampleCount' | 'totalReads' | 'mostRecentSampleDate';
export type SortDirection = 'ascending' | 'descending';
export type LocationSort = { column: LocationSortColumn; direction: SortDirection };

/** Alphabetically by location, the order the table has always had. */
export const DEFAULT_LOCATION_SORT: LocationSort = { column: 'name', direction: 'ascending' };

/**
 * The sort after clicking the header of `column`: the other direction if the rows are already
 * sorted by it, otherwise by it, locations alphabetically and everything else highest (or most
 * recent) first.
 */
export function nextLocationSort(current: LocationSort, column: LocationSortColumn): LocationSort {
    if (current.column === column) {
        return { column, direction: current.direction === 'ascending' ? 'descending' : 'ascending' };
    }
    return { column, direction: column === 'name' ? 'ascending' : 'descending' };
}

/** `locations` in the order of `sort`. Locations with the same value stay in alphabetical order. */
export function sortLocations(locations: readonly LocationOverview[], sort: LocationSort): LocationOverview[] {
    const sign = sort.direction === 'ascending' ? 1 : -1;
    return [...locations].sort((a, b) => {
        const byColumn = compareBy(sort.column, a, b);
        return byColumn === 0 ? a.name.localeCompare(b.name) : sign * byColumn;
    });
}

function compareBy(column: LocationSortColumn, a: LocationOverview, b: LocationOverview): number {
    switch (column) {
        case 'name':
            return a.name.localeCompare(b.name);
        case 'mostRecentSampleDate':
            // `YYYY-MM-DD`, so comparing the text compares the dates.
            return a.mostRecentSampleDate.localeCompare(b.mostRecentSampleDate);
        case 'sampleCount':
        case 'totalReads':
            return a[column] - b[column];
    }
}
