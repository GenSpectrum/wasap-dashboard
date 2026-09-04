import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';

import { routes } from './routes';
import { DataProviders } from './data/queryClient';
import './index.css';

// Hash routing on purpose: static hosts (GitHub Pages, plain file servers) can't
// rewrite unknown paths to index.html, and Tauri serves from a file:// origin.
// Hash routing needs no server config and keeps copy-paste share links working.
// View/filter state goes through react-router's search params, not raw history.
const router = createHashRouter(routes);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <DataProviders>
            <RouterProvider router={router} />
        </DataProviders>
    </StrictMode>,
);
