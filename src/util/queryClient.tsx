import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { createRhydbQueryClient } from '../dataLayer/hooks/connection';

/**
 * The app-wide TanStack Query client, of every data read but those from SILO (see
 * `rhydbQueryClient`). Defaults are deliberately conservative; per-query overrides live
 * with each hook.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
        },
    },
});

/**
 * The query client of the SILO reads, which `WasapLayout` hands to its `ConnectionProvider`. Kept here
 * rather than in the provider, so that the results outlive the layout, which unmounts while another
 * organism loads.
 */
export const rhydbQueryClient = createRhydbQueryClient();

export function DataProviders({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
