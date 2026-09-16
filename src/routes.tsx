import { Navigate, type RouteObject } from 'react-router-dom';

import { AppShell } from './AppShell';
import { LandingPage } from './routes/LandingPage';
import { WasapRoute } from './routes/WasapRoute';

/**
 * The route tree. Real paths (see `main.tsx`) — no `#`.
 * `/:organismPath` matches the per-organism `config.path` so the URLs the
 * wasap code builds stay valid.
 */
export const routes: RouteObject[] = [
    {
        path: '/',
        element: <AppShell />,
        children: [
            { index: true, element: <LandingPage /> },
            { path: ':organismPath', element: <WasapRoute /> },
            { path: '*', element: <Navigate to='/' replace /> },
        ],
    },
];
