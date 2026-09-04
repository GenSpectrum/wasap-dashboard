import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * The app-wide TanStack Query client.
 *
 * Every data read in the app goes through this — the resistance-data fetch
 * added in step 1c, and the `QueryClient` seam introduced in step 2. Defaults
 * are deliberately conservative; per-query overrides live with each hook.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
        },
    },
});

export function DataProviders({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
