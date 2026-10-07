import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

import { Pagination } from './pagination';

function ControlledPagination({ totalRows = 50 }: { totalRows?: number }) {
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    return (
        <Pagination
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageSizes={[10, 20]}
            totalRows={totalRows}
            onPageChange={setPageIndex}
            onPageSizeChange={setPageSize}
        />
    );
}

describe('Pagination', () => {
    it('shows the rows of the page, the last page only up to the last row', async () => {
        const screen = render(<ControlledPagination totalRows={25} />);

        await expect.element(screen.getByText('1 - 10 of 25')).toBeInTheDocument();
        await screen.getByRole('button', { name: 'Last page' }).click();
        await expect.element(screen.getByText('21 - 25 of 25')).toBeInTheDocument();
        await expect.element(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    });

    it('shows the page the buttons went to in the "Go to page" input', async () => {
        const screen = render(<ControlledPagination />);
        const goToPage = screen.getByRole('spinbutton', { name: 'Enter page number to go to' });

        await expect.element(goToPage).toHaveValue(1);
        await screen.getByRole('button', { name: 'Next page' }).click();
        await expect.element(goToPage).toHaveValue(2);
        await screen.getByRole('button', { name: 'Last page' }).click();
        await expect.element(goToPage).toHaveValue(5);
    });

    it('goes to the page typed, and to the last one for a larger number', async () => {
        const screen = render(<ControlledPagination />);
        const goToPage = screen.getByRole('spinbutton', { name: 'Enter page number to go to' });

        await goToPage.fill('3');
        await expect.element(screen.getByText('21 - 30 of 50')).toBeInTheDocument();
        await goToPage.fill('9');
        await expect.element(screen.getByText('41 - 50 of 50')).toBeInTheDocument();
        await expect.element(goToPage).toHaveValue(5);
    });
});
