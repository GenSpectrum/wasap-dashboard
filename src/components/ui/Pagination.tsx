import { useState, type ReactNode } from 'react';

export type PaginationProps = {
    /** 0-based. */
    pageIndex: number;
    pageSize: number;
    /** The page sizes to choose from. With one or none, there is no choice. */
    pageSizes: number[];
    /** The number of rows across all pages. */
    totalRows: number;
    onPageChange: (pageIndex: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    /** Shown at the very left of the pagination row, e.g. view settings. */
    startContent?: ReactNode;
    /** Shown at the very right of the pagination row, e.g. a download button. */
    endContent?: ReactNode;
};

export function Pagination({
    pageIndex,
    pageSize,
    pageSizes,
    totalRows,
    onPageChange,
    onPageSizeChange,
    startContent,
    endContent,
}: PaginationProps) {
    const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

    // The controls stay centered whether or not there is start or end content: on wide containers
    // the outer columns are equally sized, on narrow ones the start content wraps above and the
    // end content below.
    return (
        <div className='@container'>
            <div className='flex flex-col items-center gap-y-2 @xl:grid @xl:grid-cols-[1fr_auto_1fr]'>
                {startContent !== undefined && (
                    <div className='@xl:col-start-1 @xl:row-start-1 @xl:justify-self-start'>{startContent}</div>
                )}
                <div className='flex flex-wrap items-center justify-center gap-x-6 gap-y-2 @xl:col-start-2 @xl:row-start-1'>
                    <PageSizeSelector pageSize={pageSize} pageSizes={pageSizes} onPageSizeChange={onPageSizeChange} />
                    <PageIndicator pageIndex={pageIndex} pageSize={pageSize} totalRows={totalRows} />
                    {totalRows > 0 && (
                        <div className='hidden @xl:block'>
                            <GotoPageSelector pageIndex={pageIndex} pageCount={pageCount} onPageChange={onPageChange} />
                        </div>
                    )}
                    <SelectPageButtons pageIndex={pageIndex} pageCount={pageCount} onPageChange={onPageChange} />
                </div>
                {endContent !== undefined && (
                    <div className='@xl:col-start-3 @xl:row-start-1 @xl:justify-self-end'>{endContent}</div>
                )}
            </div>
        </div>
    );
}

function PageIndicator({ pageIndex, pageSize, totalRows }: { pageIndex: number; pageSize: number; totalRows: number }) {
    if (totalRows <= 1) {
        return null;
    }

    const minRow = pageIndex * pageSize + 1;
    const maxRow = Math.min(minRow + pageSize - 1, totalRows);

    return (
        <span className='text-sm'>
            {minRow} - {maxRow} of {totalRows}
        </span>
    );
}

const heightForSmallerLines = 'h-[calc(var(--size)*0.7)]';

function PageSizeSelector({
    pageSize,
    pageSizes,
    onPageSizeChange,
}: {
    pageSize: number;
    pageSizes: number[];
    onPageSizeChange: (pageSize: number) => void;
}) {
    if (pageSizes.length <= 1) {
        return null;
    }

    return (
        <label className='flex items-center'>
            <div className={'text-sm text-nowrap'}>Rows per page:</div>
            <select
                className={`select select-ghost select-sm ${heightForSmallerLines}`}
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.currentTarget.value))}
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

/**
 * What is typed is kept as it is, so that a number can be typed digit by digit (or cleared first),
 * and it goes to the page whenever it is one. When the page changes otherwise, it shows that page.
 */
function GotoPageSelector({
    pageIndex,
    pageCount,
    onPageChange,
}: {
    pageIndex: number;
    pageCount: number;
    onPageChange: (pageIndex: number) => void;
}) {
    const [typed, setTyped] = useState(String(pageIndex + 1));
    const [shownPageIndex, setShownPageIndex] = useState(pageIndex);
    if (shownPageIndex !== pageIndex) {
        setShownPageIndex(pageIndex);
        setTyped(String(pageIndex + 1));
    }

    return (
        <label className='flex items-center'>
            <span className='text-sm text-nowrap'>Go to page:</span>
            <input
                type='number'
                min='1'
                max={pageCount}
                value={typed}
                onChange={(e) => {
                    const value = e.currentTarget.value;
                    setTyped(value);
                    const page = Number(value);
                    if (value !== '' && Number.isInteger(page)) {
                        onPageChange(Math.min(Math.max(page, 1), pageCount) - 1);
                    }
                }}
                className={`input input-ghost input-sm ${heightForSmallerLines}`}
                aria-label='Enter page number to go to'
            />
        </label>
    );
}

function SelectPageButtons({
    pageIndex,
    pageCount,
    onPageChange,
}: {
    pageIndex: number;
    pageCount: number;
    onPageChange: (pageIndex: number) => void;
}) {
    const canPrevious = pageIndex > 0;
    const canNext = pageIndex < pageCount - 1;
    return (
        <div className='flex items-center gap-1' role='group' aria-label='Pagination controls'>
            <button
                type='button'
                className='btn btn-xs'
                onClick={() => onPageChange(0)}
                disabled={!canPrevious}
                aria-label='First page'
            >
                <div className='iconify mdi--chevron-left-first' />
            </button>
            <button
                type='button'
                className='btn btn-xs'
                onClick={() => onPageChange(pageIndex - 1)}
                disabled={!canPrevious}
                aria-label='Previous page'
            >
                <div className='iconify mdi--chevron-left' />
            </button>
            <button
                type='button'
                className='btn btn-xs'
                onClick={() => onPageChange(pageIndex + 1)}
                disabled={!canNext}
                aria-label='Next page'
            >
                <div className='iconify mdi--chevron-right' />
            </button>
            <button
                type='button'
                className='btn btn-xs'
                onClick={() => onPageChange(pageCount - 1)}
                disabled={!canNext}
                aria-label='Last page'
            >
                <div className='iconify mdi--chevron-right-last' />
            </button>
        </div>
    );
}
