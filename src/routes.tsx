import { Navigate, type RouteObject } from 'react-router-dom';

import { AppShell } from './AppShell';
import { DEFAULT_ORGANISM_PATH } from './config/wastewaterOrganisms';
import { WasapRoute } from './routes/WasapRoute';

/**
 * The route tree. Hash routing (see `main.tsx`) means these paths live after
 * the `#`. `/swiss-wastewater/:organismPath` matches the per-organism
 * `config.path` so the URLs the wasap code builds stay valid.
 */
export const routes: RouteObject[] = [
    {
        path: '/',
        element: <AppShell />,
        children: [
            { index: true, element: <Navigate to={`/swiss-wastewater/${DEFAULT_ORGANISM_PATH}`} replace /> },
            { path: 'swiss-wastewater/:organismPath', element: <WasapRoute /> },
            { path: '*', element: <Navigate to={`/swiss-wastewater/${DEFAULT_ORGANISM_PATH}`} replace /> },
        ],
    },
];
