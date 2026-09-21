import type { Table } from '@tanstack/table-core';
import type { ReactNode } from 'react';
import z from 'zod';

import { usePageSizeContext } from './pagination-context';

type PaginationProps = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table: Table<any>;
};
export const pageSizesSchema = z.union([z.array(z.number()), z.number()]);
export type PageSizes = z.infer<typeof pageSizesSchema>;

export function Pagination({
    table,
    pageSizes,
    totalRows,
    endContent,
}: PaginationProps & {
    pageSizes: PageSizes;
    /** Override the total row count (for server-driven pagination). */
    totalRows: number;
    /** Shown at the very right of the pagination row, e.g. a download button. */
    endContent?: ReactNode;
}) {
    // The controls stay centered whether or not there is end content: on wide containers
    // the outer columns are equally sized, on narrow ones the end content wraps below.
    return (
        <div className='@container'>
            <div className='flex flex-col items-center gap-y-2 @xl:grid @xl:grid-cols-[1fr_auto_1fr]'>
                <div className='flex flex-wrap items-center justify-center gap-x-6 gap-y-2 @xl:col-start-2'>
                    <PageSizeSelector table={table} pageSizes={pageSizes} />
                    <PageIndicator table={table} totalRows={totalRows} />
                    <div className='hidden @xl:block'>
                        <GotoPageSelector table={table} totalRows={totalRows} />
                    </div>
                    <SelectPageButtons table={table} />
                </div>
                {endContent !== undefined && <div className='@xl:col-start-3 @xl:justify-self-end'>{endContent}</div>}
            </div>
        </div>
    );
}

function PageIndicator({ table, totalRows }: PaginationProps & { totalRows: number }) {
    if (table.getPaginationRowModel().rows.length <= 1 && totalRows <= 1) {
        return null;
    }

    const minRow = table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1;
    const maxRow = minRow + table.getPaginationRowModel().rows.length - 1;

    return (
        <span className='text-sm'>
            {minRow} - {maxRow} of {totalRows}
        </span>
    );
}

const heightForSmallerLines = 'h-[calc(var(--size)*0.7)]';

function PageSizeSelector({
    table,
    pageSizes,
}: PaginationProps & {
    pageSizes: PageSizes;
}) {
    const { pageSize, setPageSize } = usePageSizeContext();

    if (typeof pageSizes === 'number' || pageSizes.length <= 1) {
        return null;
    }

    return (
        <label className='flex items-center'>
            <div className={'text-sm text-nowrap'}>Rows per page:</div>
            <select
                className={`select select-ghost select-sm ${heightForSmallerLines}`}
                value={pageSize}
                onChange={(e) => {
                    const pageSize = Number(e.currentTarget.value);
                    if (Number.isNaN(pageSize)) {
                        throw new Error(
                            `Invalid page size selected: The value ${e.currentTarget.value} could not be parsed as a number.`,
                        );
                    }
                    setPageSize(pageSize);
                    table.setPageSize(pageSize);
                }}
                aria-label='Select number of rows per page'
            >
                {pageSizes.map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                        {pageSize}
                    </option>
                ))}
            </select>
        </label>
    );
}

function GotoPageSelector({ table, totalRows }: PaginationProps & { totalRows: number }) {
    if (table.getRowModel().rows.length === 0 && totalRows === 0) {
        return null;
    }

    return (
        <label className='flex items-center'>
            <span className='text-sm text-nowrap'>Go to page:</span>
            <input
                type='number'
                min='1'
                max={table.getPageCount()}
                defaultValue={table.getState().pagination.pageIndex + 1}
                onChange={(e) => {
                    const page = e.currentTarget.value ? Number(e.currentTarget.value) - 1 : 0;
                    table.setPageIndex(Math.min(page, table.getPageCount() - 1));
                }}
                className={`input input-ghost input-sm ${heightForSmallerLines}`}
                aria-label='Enter page number to go to'
            />
        </label>
    );
}

function SelectPageButtons({ table }: PaginationProps) {
    return (
        <div className={'join'} role='group' aria-label='Pagination controls'>
            <button
                className='btn btn-outline join-item btn-sm'
                onClick={() => table.firstPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label='First page'
            >
                <div className='iconify mdi--chevron-left-first' />
            </button>
            <button
                className='btn btn-outline join-item btn-sm'
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label='Previous page'
            >
                <div className='iconify mdi--chevron-left' />
            </button>
            <button
                className='btn btn-outline join-item btn-sm'
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label='Next page'
            >
                <div className='iconify mdi--chevron-right' />
            </button>
            <button
                className='btn btn-outline join-item btn-sm'
                onClick={() => table.lastPage()}
                disabled={!table.getCanNextPage()}
                aria-label='Last page'
            >
                <div className='iconify mdi--chevron-right-last' />
            </button>
        </div>
    );
}
