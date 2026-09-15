import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { loadAppConfig } from './config/appConfig';
import { routes } from './routes';
import { DataProviders } from './util/queryClient';
import setupDayjs from './util/setupDayjs';
import './index.css';

// Real paths, not hash routing: we host on our own nginx, which serves
// `index.html` for unmatched paths with one `try_files` line — see the README's
// deploy section. `basename` matches Vite's `base`/`BASE_PATH` so sub-path
// deploys still resolve. View/filter state goes through react-router's search
// params, not raw history.
const router = createBrowserRouter(routes, {
    basename: import.meta.env.BASE_URL.replace(/\/$/, ''),
});

async function bootstrap() {
    await loadAppConfig();
    setupDayjs();

    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <DataProviders>
                <RouterProvider router={router} />
            </DataProviders>
        </StrictMode>,
    );
}

void bootstrap();
