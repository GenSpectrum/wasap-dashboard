/**
 * The active RhyDB instance, in React context.
 *
 * Each `ConnectionProvider` creates one `Connection` (`dataLayer/transport/connection.ts`)
 * for its `url` and `schema`, and every component below it shares that connection.
 * Every RhyDB read in `dataLayer/hooks/**` goes through it, so the CORS rules, the
 * retry and the logging apply to all of them.
 *
 * The provider takes `url` + `schema` as props: each organism has its own RhyDB
 * instance (`WasapPageConfig`).
 */

import { QueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { RhydbSchema } from '../queries/schema';
import { connect, type Connection } from '../transport/connection';

type RhydbInstance = { connection: Connection; schema: RhydbSchema; queryClient: QueryClient };

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
