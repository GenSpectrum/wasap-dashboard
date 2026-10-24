/**
 * The active SILO instance, in React context.
 *
 * One `Connection` (`dataLayer/transport/connection.ts`) per provider subtree: it
 * owns the transport, the CORS rules, the concurrency cap, the retry and the
 * logging, and every SILO read in `dataLayer/hooks/**` goes through it. The
 * provider also holds the query client of those reads (`createSiloQueryClient`, `siloQuery.ts`). The
 * component tree never sees a URL — it calls the `dataLayer/hooks` hooks, which
 * call `useConnection()` / `useSiloSchema()`.
 *
 * wasap is multi-organism and keeps its per-organism coordinates in `src/`
 * (`WasapPageConfig`), so this provider takes `url` + `schema` as props; `src/`
 * mounts it with the values for the organism being viewed. Runtime instance
 * selection (`?silo=` override, settings panel) is layered on top in a later
 * phase (doc 04, sub-phase 6).
 */

import { QueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { SiloSchema } from '../queries/schema';
import { connect, type Connection } from '../transport/connection';

type SiloInstance = { connection: Connection; schema: SiloSchema; queryClient: QueryClient };

/**
 * The query client of SILO reads. It doesn't retry: a request retries on its own, and only what may not
 * fail again (`query` in `dataLayer/transport/query.ts`); a retry here would resend timeouts and invalid
 * queries too, and the requests of a query function that had already answered.
 */
export function createSiloQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000,
                retry: false,
            },
        },
    });
}

const SiloInstanceContext = createContext<SiloInstance | undefined>(undefined);

export function ConnectionProvider({
    url,
    schema,
    queryClient: givenQueryClient,
    children,
}: {
    url: string;
    schema: SiloSchema;
    /**
     * The query client of the SILO reads (`createSiloQueryClient`). Without one, the provider has its own,
     * with a cache that goes when it unmounts, as for a test.
     */
    queryClient?: QueryClient;
    children: ReactNode;
}) {
    const [ownQueryClient] = useState(() => givenQueryClient ?? createSiloQueryClient());
    const queryClient = givenQueryClient ?? ownQueryClient;
    const value = useMemo<SiloInstance>(
        () => ({ connection: connect({ url, table: schema.table }), schema, queryClient }),
        [url, schema, queryClient],
    );
    return <SiloInstanceContext.Provider value={value}>{children}</SiloInstanceContext.Provider>;
}

function useSiloInstance(): SiloInstance {
    const instance = useContext(SiloInstanceContext);
    if (instance === undefined) {
        throw new Error('useConnection / useSiloSchema / useSiloQueryClient must be used inside a ConnectionProvider');
    }
    return instance;
}

/**
 * The SILO instance to read from.
 *
 * Stable while the instance is, so it can be a dependency of a memo, an effect
 * or a TanStack query key (spread `connection.key`).
 */
export function useConnection(): Connection {
    return useSiloInstance().connection;
}

/** The column names the current instance's queries name (`dataLayer/queries`). */
export function useSiloSchema(): SiloSchema {
    return useSiloInstance().schema;
}

/** The query client of the SILO reads; see `siloQuery.ts`. */
export function useSiloQueryClient(): QueryClient {
    return useSiloInstance().queryClient;
}
