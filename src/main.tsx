import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { loadAppConfig } from './config/appConfig';
import { routes } from './routes';
import './index.css';

// Real paths, not hash routing: we host on our own nginx, which serves
// `index.html` for unmatched paths with one `try_files` line — see the README's
// deploy section. `basename` matches Vite's `base`/`BASE_PATH` so sub-path
// deploys still resolve. View/filter state goes through react-router's search
// params, not raw history.
const router = createBrowserRouter(routes, {
    basename: import.meta.env.BASE_URL.replace(/\/$/, ''),
});

/**
 * The app-wide TanStack Query client, of every data read but those from RhyDB (which have their own,
 * see `WasapLayout`). Defaults are deliberately conservative; per-query overrides live with each hook.
 */
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
        },
    },
});

async function bootstrap() {
    await loadAppConfig();

    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
            </QueryClientProvider>
        </StrictMode>,
    );
}

void bootstrap();
