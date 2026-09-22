import { Navigate, type RouteObject } from 'react-router-dom';

import { AppShell } from './AppShell';
import { LandingPage } from './routes/LandingPage';
import { WasapModeRoute, WasapOverviewRoute, WasapRoute } from './routes/WasapRoute';

/**
 * The route tree. Real paths (see `main.tsx`) — no `#`.
 * `/:organismPath` matches the per-organism `config.path` so the URLs the
 * wasap code builds stay valid. It is the organism's overview page (the bare
 * URL, no redirect); every analysis mode is a page below it, `/:organismPath/:mode`.
 */
export const routes: RouteObject[] = [
    {
        path: '/',
        element: <AppShell />,
        children: [
            { index: true, element: <LandingPage /> },
            {
                path: ':organismPath',
                element: <WasapRoute />,
                children: [
                    { index: true, element: <WasapOverviewRoute /> },
                    { path: ':mode', element: <WasapModeRoute /> },
                ],
            },
            { path: '*', element: <Navigate to='/' replace /> },
        ],
    },
];
