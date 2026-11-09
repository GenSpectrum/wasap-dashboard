import type { createBrowserRouter } from 'react-router-dom';

type AppRouter = Pick<ReturnType<typeof createBrowserRouter>, 'state' | 'subscribe' | 'createHref'>;

/** The `type` of the message that tells an embedding page where the dashboard is. */
export const LOCATION_MESSAGE_TYPE = 'wasap:location';

export type LocationMessage = {
    type: typeof LOCATION_MESSAGE_TYPE;
    /** Path, search and hash of the current page, including the base path, e.g. `/covid/lineagePrevalence?granularity=day`. */
    path: string;
};

/**
 * When the dashboard is shown in a frame of another site, tells that site the dashboard's current page and filters,
 * once at startup and again after every navigation, so that the site can keep a link to the same view in its own
 * address bar. The site appends `path` to the dashboard's origin to get the dashboard's URL.
 *
 * The message carries nothing beyond what is in the dashboard's own URL, so it is sent to whichever page embeds it.
 */
export function reportLocationToEmbeddingPage(
    router: AppRouter,
    embeddingWindow: Window | null = getEmbeddingWindow(),
) {
    if (embeddingWindow === null) {
        return;
    }

    let lastPath: string | undefined;
    const report = () => {
        const path = router.createHref(router.state.location);
        if (path === lastPath) {
            return;
        }
        lastPath = path;
        const message: LocationMessage = { type: LOCATION_MESSAGE_TYPE, path };
        embeddingWindow.postMessage(message, '*');
    };

    report();
    router.subscribe(report);
}

function getEmbeddingWindow(): Window | null {
    return window.parent === window ? null : window.parent;
}
