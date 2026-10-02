import { useMemo, useState, type FC, type ReactNode } from 'react';

import {
    DEFAULT_LOCATION_SORT,
    nextLocationSort,
    sortLocations,
    type LocationSort,
    type LocationSortColumn,
} from './locationSort';
import { useSampleOverview } from '../../dataLayer/hooks/sampleOverview';
import { readLocationOverview } from '../../dataLayer/queries';
import { Loading } from '../../util/Loading';
import { TitledPanel } from '../shared/TitledPanel';

/**
 * One row per location: its name, how many samples were collected there, how many amplicon
 * sequences they have together, and the most recent sample. Sorted alphabetically until a
 * column header is clicked.
 */
export const LocationOverviewTable: FC = () => {
    const { data, isPending, isError, error } = useSampleOverview();
    const [sort, setSort] = useState<LocationSort>(DEFAULT_LOCATION_SORT);
    const locations = useMemo(
        () => (data === undefined ? undefined : sortLocations(readLocationOverview(data), sort)),
        [data, sort],
    );

    if (isError) {
        return (
            <TitledPanel title='Sampling locations'>
                <span>{error.message}</span>
            </TitledPanel>
        );
    }

    if (isPending || locations === undefined) {
        return (
            <TitledPanel title='Sampling locations'>
                <Loading />
            </TitledPanel>
        );
    }

    const header = (column: LocationSortColumn, label: string) => (
        <SortableHeader column={column} sort={sort} onSortChange={setSort}>
            {label}
        </SortableHeader>
    );

    return (
        <TitledPanel title='Sampling locations'>
            {/* Out to the panel's sides and bottom, so the row lines reach its border and the last row
                is as tall as the others. The outer cells take over the panel's padding, which keeps the
                text in line with the title. */}
            <table className='-mx-4 -mb-4 w-[calc(100%+2rem)] text-sm [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4'>
                <thead>
                    <tr className='border-b border-stone-300 text-left'>
                        {header('name', 'Location')}
                        {header('sampleCount', 'Samples')}
                        {header('totalReads', 'Amplicon sequences')}
                        {header('mostRecentSampleDate', 'Most recent sample')}
                    </tr>
                </thead>
                <tbody>
                    {locations.map((location) => (
                        <tr key={location.name} className='border-b border-stone-200 last:border-b-0'>
                            <td className='p-2'>{location.name}</td>
                            <td className='p-2'>{location.sampleCount.toLocaleString('en-us')}</td>
                            <td className='p-2'>{location.totalReads.toLocaleString('en-us')}</td>
                            <td className='p-2'>{location.mostRecentSampleDate}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </TitledPanel>
    );
};

/**
 * The header of a column the rows can be sorted by, the same as the feature bands' own: clicking
 * it sorts by the column, or reverses the order if they already are. The arrow shows the direction
 * they are sorted in, or, faded, the one a click would sort them in.
 */
function SortableHeader({
    column,
    sort,
    onSortChange,
    children,
}: {
    column: LocationSortColumn;
    sort: LocationSort;
    onSortChange: (sort: LocationSort) => void;
    children: ReactNode;
}) {
    const isSorted = sort.column === column;
    const shownDirection = isSorted ? sort.direction : nextLocationSort(sort, column).direction;
    return (
        <th className='p-2' aria-sort={isSorted ? sort.direction : 'none'}>
            <button
                type='button'
                className='inline-flex cursor-pointer items-center gap-1 font-bold'
                onClick={() => onSortChange(nextLocationSort(sort, column))}
            >
                {children}
                <span aria-hidden='true' className={isSorted ? '' : 'opacity-25'}>
                    {shownDirection === 'ascending' ? '▲' : '▼'}
                </span>
            </button>
        </th>
    );
}
