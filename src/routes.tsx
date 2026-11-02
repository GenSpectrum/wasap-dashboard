import { Navigate, type RouteObject } from 'react-router-dom';

import { AppShell } from './AppShell';
import { AboutPage } from './routes/AboutPage';
import { LandingPage } from './routes/LandingPage';
import { ModeRoute, OverviewRoute } from './routes/ModeRoute';
import { OrganismRoute } from './routes/OrganismRoute';

/**
 * The route tree. Real paths (see `main.tsx`) — no `#`.
 * `/:organismPath` matches the per-organism `config.path` so the URLs the
 * wasap code builds stay valid. It is the organism's overview page (the bare
 * URL, no redirect); every analysis mode is a page below it, `/:organismPath/:mode`, and so is
 * the about page, `/:organismPath/about`. The about page is also at `/about`, for the landing page.
 */
export const routes: RouteObject[] = [
    {
        path: '/',
        element: <AppShell />,
        children: [
            { index: true, element: <LandingPage /> },
            // The about page without an organism, for the landing page. Under an organism it keeps the mode tabs.
            { path: 'about', element: <AboutPage /> },
            {
                path: ':organismPath',
                element: <OrganismRoute />,
                children: [
                    { index: true, element: <OverviewRoute /> },
                    { path: 'about', element: <AboutPage /> },
                    { path: ':mode', element: <ModeRoute /> },
                ],
            },
            { path: '*', element: <Navigate to='/' replace /> },
        ],
    },
];
