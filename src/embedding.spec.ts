import { createMemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { LOCATION_MESSAGE_TYPE, reportLocationToEmbeddingPage } from './embedding';

const routes = [{ path: '/', children: [{ path: ':organismPath/:mode', element: null }] }];

function setUp(options: { basename?: string } = {}) {
    const router = createMemoryRouter(routes, {
        initialEntries: [`${options.basename ?? ''}/covid/variantExplorer?granularity=day`],
        basename: options.basename,
    });
    const postMessage = vi.fn();
    reportLocationToEmbeddingPage(router, { postMessage } as unknown as Window);
    const paths = () => postMessage.mock.calls.map(([message]) => (message as { path: string }).path);
    return { router, postMessage, paths };
}

describe('reportLocationToEmbeddingPage', () => {
    it('reports the location at startup', () => {
        const { postMessage } = setUp();

        expect(postMessage).toHaveBeenCalledWith(
            { type: LOCATION_MESSAGE_TYPE, path: '/covid/variantExplorer?granularity=day' },
            '*',
        );
    });

    it('reports every navigation, including going back', async () => {
        const { router, paths } = setUp();

        await router.navigate('/covid/lineagePrevalence?locationName=Chur+%28GR%29');
        await router.navigate(-1);

        await vi.waitFor(() =>
            expect(paths()).toEqual([
                '/covid/variantExplorer?granularity=day',
                '/covid/lineagePrevalence?locationName=Chur+%28GR%29',
                '/covid/variantExplorer?granularity=day',
            ]),
        );
    });

    it('reports a path only when it changes', async () => {
        const { router, paths } = setUp();

        await router.navigate('/covid/variantExplorer?granularity=day');

        expect(paths()).toEqual(['/covid/variantExplorer?granularity=day']);
    });

    it('includes the base path', async () => {
        const { router, paths } = setUp({ basename: '/wasap' });

        await router.navigate('/rsv-a/variantExplorer');

        expect(paths()).toEqual(['/wasap/covid/variantExplorer?granularity=day', '/wasap/rsv-a/variantExplorer']);
    });

    it('does nothing when the dashboard is not embedded', () => {
        const router = createMemoryRouter(routes);
        const subscribe = vi.spyOn(router, 'subscribe');

        reportLocationToEmbeddingPage(router, null);

        expect(subscribe).not.toHaveBeenCalled();
    });
});
