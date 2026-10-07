import { useCallback, useState } from 'react';

import { useBandViewSettings } from './band-view-settings';
import { CsvDownloadButton, type DataValue } from './csv-download-button';
import { FeatureBands, type FeatureBandsProps } from './feature-bands';
import { DEFAULT_FEATURE_SORT, type FeatureSort } from './featureSort';
import { type TemporalDataMap } from './mutationsOverTime/MutationOverTimeData';
import { getProportion } from './overTime/proportionValue';
import { ViewSettingsControls } from './view-settings-controls';
import { toTemporalClass } from '../../util/temporalClass';

/**
 * What the user chose in an over-time grid: the sort, the page and the page size. Hold it above
 * where the grid's data loads, so that it survives reloading the data when the filters change.
 */
export function useOverTimeGridState(pageSizes: number[]) {
    // `undefined` until a header is clicked: the default can depend on the rows (see `sortOr`).
    const [sort, setSort] = useState<FeatureSort | undefined>(undefined);
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(pageSizes[0]);

    // Back to the first page in the same render as the new order or page size, so the
    // queries of whatever page was open are never sent for the reordered rows.
    const changeSort = useCallback((newSort: FeatureSort) => {
        setSort(newSort);
        setPageIndex(0);
    }, []);
    const changePageSize = useCallback((newPageSize: number) => {
        setPageSize(newPageSize);
        setPageIndex(0);
    }, []);
    const pageOf = useCallback(
        <T,>(rows: T[]): T[] => rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
        [pageIndex, pageSize],
    );

    return {
        pageIndex,
        pageSize,
        pageSizes,
        setPageIndex,
        /**
         * The sort clicked, or `defaultSort`: also instead of a sort by a Jaccard index when the
         * rows have none (any more, e.g. in another mode).
         */
        sortOr: (defaultSort: FeatureSort = DEFAULT_FEATURE_SORT, hasJaccardIndices = false): FeatureSort =>
            sort === undefined || (sort.column === 'jaccardIndex' && !hasJaccardIndices) ? defaultSort : sort,
        changeSort,
        changePageSize,
        /** The rows of the current page, of all the rows in their order. */
        pageOf,
    };
}

export type OverTimeGridState = ReturnType<typeof useOverTimeGridState>;

type OverTimeGridProps<F> = Omit<FeatureBandsProps<F>, 'viewSettings' | 'pagination' | 'onSortChange'> & {
    state: OverTimeGridState;
    /** The number of rows across all pages. */
    totalRows: number;
    csv: { filename: string; getRows: () => Record<string, DataValue>[] };
};

/**
 * The feature bands of the rows over time with what goes around them in all the over-time grids:
 * a box, the view settings, the pagination and the CSV download.
 */
export function OverTimeGrid<F>({ state, totalRows, csv, ...bandsProps }: OverTimeGridProps<F>) {
    const [viewSettings, setViewSettings] = useBandViewSettings();

    return (
        <div className='border border-stone-300 bg-white'>
            <FeatureBands
                {...bandsProps}
                viewSettings={viewSettings}
                onSortChange={state.changeSort}
                pagination={{
                    pageIndex: state.pageIndex,
                    pageSize: state.pageSize,
                    pageSizes: state.pageSizes,
                    totalRows,
                    onPageChange: state.setPageIndex,
                    onPageSizeChange: state.changePageSize,
                    startContent: <ViewSettingsControls settings={viewSettings} onChange={setViewSettings} />,
                    endContent: (
                        <CsvDownloadButton
                            className='btn btn-xs'
                            label='Download CSV'
                            getData={csv.getRows}
                            filename={csv.filename}
                        />
                    ),
                }}
            />
        </div>
    );
}

/** The proportion of `row` in each date range of `data`, by date, for its line in a CSV download. */
export function proportionsByDate<F>(data: TemporalDataMap<F>, row: F): Record<string, number | ''> {
    return Object.fromEntries(
        data
            .getSecondAxisKeys()
            .map((date) => [toTemporalClass(date).dateString, getProportion(data.get(row, date) ?? null) ?? '']),
    );
}
