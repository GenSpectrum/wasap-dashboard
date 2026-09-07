/**
 * The clinical-LAPIS client, in React context.
 *
 * Mounted by the `variant` / `untracked` filter panels around the lineage
 * picker — the one place wasap still reads from clinical LAPIS (see
 * `components/lapis/client.ts`). Parallel to `components/data/connection.tsx`'s
 * `ConnectionProvider`: same shape, different backend.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { lapisClient, type LapisClient } from './client';

const LapisClientContext = createContext<LapisClient | undefined>(undefined);

export function LapisClientProvider({ url, children }: { url: string; children: ReactNode }) {
    const client = useMemo(() => lapisClient(url), [url]);
    return <LapisClientContext.Provider value={client}>{children}</LapisClientContext.Provider>;
}

export function useLapisClient(): LapisClient {
    const client = useContext(LapisClientContext);
    if (client === undefined) {
        throw new Error('useLapisClient must be used inside a LapisClientProvider');
    }
    return client;
}
