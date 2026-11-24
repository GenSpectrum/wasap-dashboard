import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

import { CsvDownloadButton, type CsvDownloadContext } from './CsvDownloadButton';

describe('CsvDownloadButton', () => {
    it('shows the progress getData reports while it loads', async () => {
        let context: CsvDownloadContext | undefined;
        let finish: () => void = () => {};
        const screen = render(
            <CsvDownloadButton
                label='Download CSV'
                getData={(given) => {
                    context = given;
                    return new Promise((resolve) => {
                        finish = () => resolve([]);
                    });
                }}
            />,
        );

        await screen.getByRole('button', { name: 'Download CSV' }).click();
        context!.onProgress(0.425);
        await expect.element(screen.getByRole('status')).toHaveTextContent('42%');

        finish();
        await expect.element(screen.getByRole('button', { name: 'Download CSV' })).toBeEnabled();
        await expect.element(screen.getByRole('status')).not.toBeInTheDocument();
    });

    it('aborts the download when it unmounts', async () => {
        let signal: AbortSignal | undefined;
        const screen = render(
            <CsvDownloadButton
                label='Download CSV'
                getData={(given) => {
                    signal = given.signal;
                    return new Promise(() => {});
                }}
            />,
        );

        await screen.getByRole('button', { name: 'Download CSV' }).click();
        expect(signal?.aborted).toBe(false);
        screen.unmount();
        expect(signal?.aborted).toBe(true);
    });

    it('marks the button when the download failed', async () => {
        const screen = render(
            <CsvDownloadButton label='Download CSV' getData={() => Promise.reject(new Error('the server is down'))} />,
        );

        await screen.getByRole('button', { name: 'Download CSV' }).click();
        await expect
            .element(screen.getByRole('button', { name: 'Download CSV' }))
            .toHaveAttribute('title', 'Download CSV (the last try failed: the server is down)');
    });
});
