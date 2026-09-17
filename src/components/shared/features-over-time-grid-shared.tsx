import type { Table } from '@tanstack/table-core';
import { type FC, type ReactElement } from 'react';

import { type ColorScale, getColorWithinScale, getTextColorForScale } from './color-scale-selector';
import PortalTooltip from './portal-tooltip';
import { formatProportion } from './table/formatProportion';
import { type PageSizes, Pagination } from './tanstackTable/pagination';
import { flexRender } from './tanstackTable/tanstackTable';
import { type TooltipPosition } from './tooltip';
import { getProportion, type ProportionValue } from '../../query/queryMutationsOverTime';

/**
 * The pagination footer row, with an optional action (e.g. a download button)
 * pinned to the right. `footerAction` is absolutely positioned rather than a
 * grid/flex sibling, so it doesn't shrink Pagination's own box - Pagination's
 * internal controls (rows-per-page, page indicator, go-to-page, prev/next)
 * wrap onto multiple lines if the width they get to work with is constrained,
 * same as any flex-wrap content squeezed into a narrower column.
 */
export function PaginationFooter<T>({
    table,
    pageSizes,
    totalRows,
    footerAction,
}: {
    table: Table<T>;
    pageSizes: PageSizes;
    totalRows: number;
    footerAction?: ReactElement;
}) {
    return (
        <div className='relative mt-2'>
            <Pagination table={table} pageSizes={pageSizes} totalRows={totalRows} />
            {footerAction && <div className='absolute top-1/2 right-0 -translate-y-1/2'>{footerAction}</div>}
        </div>
    );
}

const NON_BREAKING_SPACE = ' ';

/**
 * A single data cell in an over-time grid: a color-scaled block showing a proportion, with a
 * tooltip that appears on hover. The proportion text is hidden on narrow columns, since it
 * wouldn't fit without breaking the grid layout.
 */
export const ProportionCell: FC<{
    value: ProportionValue;
    tooltip: ReactElement;
    tooltipPosition: TooltipPosition;
    colorScale: ColorScale;
    tooltipPortalTarget: HTMLElement | null;
}> = ({ value, tooltip, tooltipPosition, colorScale, tooltipPortalTarget }) => {
    const proportion = getProportion(value);

    return (
        <div className={'h-full w-full py-1'}>
            <PortalTooltip content={tooltip} position={tooltipPosition} portalTarget={tooltipPortalTarget}>
                <div
                    style={{
                        backgroundColor: getColorWithinScale(proportion, colorScale),
                        color: getTextColorForScale(proportion, colorScale),
                    }}
                    className={`group @container h-full w-full text-xs text-nowrap hover:font-bold`}
                >
                    {value === null ? (
                        <span className='invisible'>No data</span>
                    ) : (
                        <span className='invisible @[2rem]:visible'>
                            {proportion !== undefined ? formatProportion(proportion, 0) : NON_BREAKING_SPACE}
                        </span>
                    )}
                </div>
            </PortalTooltip>
        </div>
    );
};

type FeaturesOverTimeGridDisplayProps<T> = {
    table: Table<T>;
    pageSizes: PageSizes;
    totalRows?: number;
    loadingState?:
        | {
              isLoading: boolean;
              loadingRowLabels: string[];
          }
        | { isLoading: false; loadingRowLabels?: never };
    /** Rendered in the pagination footer row, right-aligned (e.g. a download button). */
    footerAction?: ReactElement;
};

/**
 * Renders a tanstack-table `Table` as an over-time grid: header row, data rows (or skeleton
 * loading rows with a spinner while `loadingState.isLoading` is true), and pagination footer.
 * Shared by all over-time grids (mutations, queries, mutation co-occurrence) so they present
 * identically regardless of what their columns represent.
 */
export function FeaturesOverTimeGridDisplay<T>({
    table,
    pageSizes,
    loadingState,
    totalRows,
    footerAction,
}: FeaturesOverTimeGridDisplayProps<T>) {
    const displayedTotalRows = totalRows ?? table.getCoreRowModel().rows.length;

    return (
        <div className='w-full'>
            <table className={'w-full'}>
                <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <th key={header.id} colSpan={header.colSpan} style={{ width: `${header.getSize()}px` }}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {loadingState?.isLoading ? (
                        loadingState.loadingRowLabels.map((label, rowIndex) => (
                            <tr key={label}>
                                <td className='text-center'>{label}</td>
                                {rowIndex === 0 && (
                                    <td
                                        rowSpan={loadingState.loadingRowLabels.length}
                                        colSpan={table.getFlatHeaders().length - 1}
                                        className='text-center'
                                    >
                                        <span className='loading loading-spinner loading-sm' />
                                    </td>
                                )}
                            </tr>
                        ))
                    ) : (
                        <>
                            {table.getRowModel().rows.map((row) => (
                                <tr key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {table.getRowModel().rows.length === 0 && (
                                <tr>
                                    <td colSpan={table.getFlatHeaders().length}>
                                        <div className={'text-center'}>No data available for your filters.</div>
                                    </td>
                                </tr>
                            )}
                        </>
                    )}
                </tbody>
            </table>
            <PaginationFooter
                table={table}
                pageSizes={pageSizes}
                totalRows={displayedTotalRows}
                footerAction={footerAction}
            />
        </div>
    );
}

/**
 * Show date column headers only for the first and last column, when there is little space.
 * Shows all dates if enough space is there.
 */
export function styleGridHeader(columnIndex: number, numDateColumns: number) {
    if (columnIndex === 0) {
        return { className: 'overflow-visible text-nowrap' };
    }

    if (columnIndex === numDateColumns - 1) {
        return { className: 'overflow-visible text-nowrap', style: { direction: 'rtl' as const } };
    }

    return { className: 'invisible @[6rem]:visible' };
}

/**
 * Picks which side of a cell the tooltip should open on, so it stays within the visible grid
 * instead of overflowing off the top/bottom or left/right edge (meaning the tooltip tends to
 * open towards the 'center' of the component).
 */
export function getTooltipPosition(
    rowIndex: number,
    rows: number,
    columnIndex: number,
    columns: number,
): TooltipPosition {
    const tooltipX = rowIndex < rows / 2 || rowIndex < 6 ? 'bottom' : 'top';
    const tooltipY = columnIndex < columns / 2 ? 'start' : 'end';
    return `${tooltipX}-${tooltipY}`;
}
