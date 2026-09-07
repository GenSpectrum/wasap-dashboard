/**
 * The active SILO instance, in React context.
 *
 * One `Connection` (`components/rhydb/connection.ts`) per provider subtree: it
 * owns the transport, the CORS rules, the concurrency cap, the retry and the
 * logging, and every SILO read in `components/data/**` goes through it. The
 * component tree never sees a URL — it calls the `data/` hooks, which call
 * `useConnection()`.
 *
 * Unlike `wastewater-analytics-experiment`'s `instance.tsx` (a single-organism
 * app that bundles its one config here), wasap is multi-organism and keeps its
 * per-organism coordinates in `src/` (`WasapPageConfig`). So this provider takes
 * `url` + `table` as props; `src/` mounts it with the values for the organism
 * being viewed. Runtime instance selection (`?silo=` override, settings panel)
 * is layered on top in a later phase (doc 04, sub-phase 6).
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { connect, type Connection } from '../rhydb/connection';

const ConnectionContext = createContext<Connection | undefined>(undefined);

export function ConnectionProvider({ url, table, children }: { url: string; table: string; children: ReactNode }) {
    const connection = useMemo(() => connect({ url, table }), [url, table]);
    return <ConnectionContext.Provider value={connection}>{children}</ConnectionContext.Provider>;
}

/**
 * The SILO instance to read from.
 *
 * Stable while the instance is, so it can be a dependency of a memo, an effect
 * or a TanStack query key (spread `connection.key`).
 */
export function useConnection(): Connection {
    const connection = useContext(ConnectionContext);
    if (connection === undefined) {
        throw new Error('useConnection must be used inside a ConnectionProvider');
    }
    return connection;
}
