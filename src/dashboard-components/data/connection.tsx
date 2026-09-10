/**
 * The active SILO instance, in React context.
 *
 * One `Connection` (`components/rhydb/connection.ts`) per provider subtree: it
 * owns the transport, the CORS rules, the concurrency cap, the retry and the
 * logging, and every SILO read in `components/data/**` goes through it. The
 * component tree never sees a URL — it calls the `data/` hooks, which call
 * `useConnection()` / `useSiloSchema()`.
 *
 * wasap is multi-organism and keeps its per-organism coordinates in `src/`
 * (`WasapPageConfig`), so this provider takes `url` + `schema` as props; `src/`
 * mounts it with the values for the organism being viewed. Runtime instance
 * selection (`?silo=` override, settings panel) is layered on top in a later
 * phase (doc 04, sub-phase 6).
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { connect, type Connection } from '../../rhydb/connection';
import type { SiloSchema } from '../../queries/schema';

type SiloInstance = { connection: Connection; schema: SiloSchema };

const SiloInstanceContext = createContext<SiloInstance | undefined>(undefined);

export function ConnectionProvider({
    url,
    schema,
    children,
}: {
    url: string;
    schema: SiloSchema;
    children: ReactNode;
}) {
    const value = useMemo<SiloInstance>(
        () => ({ connection: connect({ url, table: schema.table }), schema }),
        [url, schema],
    );
    return <SiloInstanceContext.Provider value={value}>{children}</SiloInstanceContext.Provider>;
}

function useSiloInstance(): SiloInstance {
    const instance = useContext(SiloInstanceContext);
    if (instance === undefined) {
        throw new Error('useConnection / useSiloSchema must be used inside a ConnectionProvider');
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

/** The column names the current instance's queries name (`components/queries`). */
export function useSiloSchema(): SiloSchema {
    return useSiloInstance().schema;
}
