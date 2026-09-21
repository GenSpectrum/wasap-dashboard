import { type Dispatch, type SetStateAction, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { PageStateHandler } from './PageStateHandler';

/**
 * Given a `PageStateHandler`, derives the page state from the URL's search
 * params and returns it together with a `setPageState` function that writes a
 * new state back to the URL (adding a history entry).
 *
 * Standalone: this used to read/write `window.location` + `window.history`
 * directly. Under the hash router the query string is in the fragment, so it
 * goes through react-router's `useSearchParams` instead. Page state is now
 * derived from the URL rather than held in local `useState` — back/forward and
 * shared links then need no extra wiring.
 */
export function usePageState<PageState extends object>(pageStateHandler: PageStateHandler<PageState>) {
    const [searchParams, setSearchParams] = useSearchParams();

    const pageState = useMemo(
        () => pageStateHandler.parsePageStateFromUrl(searchParams),
        [pageStateHandler, searchParams],
    );

    const setPageState: Dispatch<SetStateAction<PageState>> = useCallback(
        (newPageStateOrUpdater) => {
            const newPageState =
                typeof newPageStateOrUpdater === 'function'
                    ? newPageStateOrUpdater(pageStateHandler.parsePageStateFromUrl(searchParams))
                    : newPageStateOrUpdater;
            setSearchParams(pageStateHandler.toSearchParams(newPageState));
        },
        [pageStateHandler, searchParams, setSearchParams],
    );

    return useMemo(() => ({ pageState, setPageState }), [pageState, setPageState]);
}
