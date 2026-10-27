/**
 * The active RhyDB instance, in React context.
 *
 * Each `ConnectionProvider` creates one `Connection` (`dataLayer/transport/connection.ts`)
 * for its `url` and `schema`, and every component below it shares that connection.
 * Every RhyDB read in `dataLayer/hooks/**` goes through it, so the CORS rules, the
 * retry and the logging apply to all of them. The concurrency cap
 * (`transport/requestLimit.ts`) is global, shared across all connections. The
 * provider also holds the query client of those reads (`createRhydbQueryClient`, `rhydbQuery.ts`). The
 * component tree never sees a URL — it calls the `dataLayer/hooks` hooks, which
 * call `useConnection()` / `useRhydbSchema()`.
 *
 * wasap is multi-organism and keeps its per-organism coordinates in `src/`
 * (`WasapPageConfig`), so this provider takes `url` + `schema` as props; `src/`
 * mounts it with the values for the organism being viewed. Runtime instance
 * selection (`?rhydb=` override, settings panel) is layered on top in a later
 * phase (doc 04, sub-phase 6).
 */

import { QueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { RhydbSchema } from '../queries/schema';
import { connect, type Connection } from '../transport/connection';

type RhydbInstance = { connection: Connection; schema: RhydbSchema; queryClient: QueryClient };

/**
 * The query client of RhyDB reads. It doesn't retry: a request retries on its own, and only what may not
 * fail again (`query` in `dataLayer/transport/query.ts`); a retry here would resend timeouts and invalid
 * queries too, and the requests of a query function that had already answered.
 */
export function createRhydbQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000,
                retry: false,
            },
        },
    });
}

const RhydbInstanceContext = createContext<RhydbInstance | undefined>(undefined);

export function ConnectionProvider({
    url,
    schema,
    queryClient: givenQueryClient,
    children,
}: {
    url: string;
    schema: RhydbSchema;
    /**
     * The query client of the RhyDB reads (`createRhydbQueryClient`). Without one, the provider has its own,
     * with a cache that goes when it unmounts, as for a test.
     */
    queryClient?: QueryClient;
    children: ReactNode;
}) {
    const [ownQueryClient] = useState(() => givenQueryClient ?? createRhydbQueryClient());
    const queryClient = givenQueryClient ?? ownQueryClient;
    const value = useMemo<RhydbInstance>(
        () => ({ connection: connect({ url, table: schema.table }), schema, queryClient }),
        [url, schema, queryClient],
    );
    return <RhydbInstanceContext.Provider value={value}>{children}</RhydbInstanceContext.Provider>;
}

function useRhydbInstance(): RhydbInstance {
    const instance = useContext(RhydbInstanceContext);
    if (instance === undefined) {
        throw new Error(
            'useConnection / useRhydbSchema / useRhydbQueryClient must be used inside a ConnectionProvider',
        );
    }
    return instance;
}

/**
 * The RhyDB instance to read from.
 *
 * Stable while the instance is, so it can be a dependency of a memo, an effect
 * or a TanStack query key (spread `connection.key`).
 */
export function useConnection(): Connection {
    return useRhydbInstance().connection;
}

/** The column names the current instance's queries name (`dataLayer/queries`). */
export function useRhydbSchema(): RhydbSchema {
    return useRhydbInstance().schema;
}

/** The query client of the RhyDB reads; see `rhydbQuery.ts`. */
export function useRhydbQueryClient(): QueryClient {
    return useRhydbInstance().queryClient;
}
