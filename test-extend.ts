import { setupWorker } from 'msw/browser';
import '@testing-library/jest-dom/vitest';
import { it as itBase } from 'vitest';

import { BackendRouteMocker, CovSpectrumRouteMocker, LapisRouteMocker, SiloRouteMocker } from './routeMocker.ts';

export const worker = setupWorker();

export const lapisRouteMocker = new LapisRouteMocker(worker);
export const backendRouteMocker = new BackendRouteMocker(worker);
export const covSpectrumRouteMocker = new CovSpectrumRouteMocker(worker);
export const siloRouteMocker = new SiloRouteMocker(worker);

const workerFixture = itBase.extend<{ mswWorker: never }>({
    mswWorker: [
        // eslint-disable-next-line no-empty-pattern -- vitest needs the 1st arg to be an object destructor
        async ({}, use) => {
            await worker.start({ onUnhandledRequest: 'error' });
            try {
                await use(undefined as never);
            } finally {
                worker.stop();
            }
        },
        { scope: 'file', auto: true },
    ],
});

/**
 * Test extension to access the mocks. Import it:
 *
 *     import { it } from '../../../test-extend';
 *
 * use like this:
 *
 *     it('...', async ({ routeMockers }) => {
 *         routeMockers.lapis.mockLineageDefinition('pangoLineage', {
 *             'JN.1': { parents: ['BA.2'], aliases: [] },
 *         });
 *         ...
 */
export const it = workerFixture.extend<{
    routeMockers: {
        lapis: LapisRouteMocker;
        backend: BackendRouteMocker;
        covSpectrum: CovSpectrumRouteMocker;
        silo: SiloRouteMocker;
    };
}>({
    routeMockers: [
        // eslint-disable-next-line no-empty-pattern -- vitest needs the 1st arg to be an object destructor
        async ({}, use) => {
            await use({
                lapis: lapisRouteMocker,
                backend: backendRouteMocker,
                covSpectrum: covSpectrumRouteMocker,
                silo: siloRouteMocker,
            });

            worker.resetHandlers();
        },
        {
            auto: true,
        },
    ],
});
