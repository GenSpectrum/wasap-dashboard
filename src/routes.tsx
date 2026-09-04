import type { RouteObject } from 'react-router-dom';

import { AppShell } from './AppShell';
import { ScaffoldRoute } from './routes/ScaffoldRoute';

/**
 * The route tree.
 *
 * Hash routing (see `main.tsx`) means these paths live after the `#`. The
 * organism routes (`/:organism`) arrive in step 1c; the shape here leaves room
 * for them without a rewrite.
 */
export const routes: RouteObject[] = [
    {
        path: '/',
        element: <AppShell />,
        children: [{ index: true, element: <ScaffoldRoute /> }],
    },
];
