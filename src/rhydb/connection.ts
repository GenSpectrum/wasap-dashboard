/**
 * One RhyDB instance and one table in it: build a query rooted at the table,
 * send it, or print the equivalent curl command.
 *
 * Every request the application makes is sent by `query` here, which is what
 * makes the CORS rules, the retry and the concurrency limit apply to all of
 * them. `key` and `id` are the instance's identity, for code that caches per
 * instance.
 */

import { curlFor, query as send, type QueryResult } from './query';
import { table as tableRelation, type Queryable, type Relation } from './relation';
import { PRIORITY, withRequestLimit } from './requestLimit';
import type { RhydbRow } from './row';

export type Connection = {
    readonly url: string;
    readonly table: string;
    /**
     * The instance's identity as a cache-key prefix. Spread it, so the key
     * stays a structurally hashable array: `['rows', ...connection.key, 1]`.
     */
    readonly key: readonly [url: string, table: string];
    /** The same identity as one string, for caches that key on text. */
    readonly id: string;
    /** The table, as the root of a query. */
    root(): Relation;
    /**
     * Sends a query and returns its typed rows.
     *
     * Takes a relation or the text of one, so hand-written query text is sent
     * under the same rules, retry and logging as everything else.
     */
    query<Row extends RhydbRow = RhydbRow>(
        query: Queryable | string,
        /** What asked for it, as the user sees that part of the page named. */
        label: string,
        options?: {
            signal?: AbortSignal;
            /** Which requests this one yields to; see `PRIORITY`. */
            priority?: number;
        },
    ): Promise<QueryResult<Row>>;
    /** The curl command that reproduces a query, with the headers actually sent. */
    curl(query: Queryable | string): string;
};

export function connect(options: { url: string; table: string }): Connection {
    const { url, table } = options;
    return {
        url,
        table,
        key: [url, table],
        id: `${url}|${table}`,
        root: () => tableRelation(table),
        // The time spent waiting for a place is measured here and handed on,
        // so the logged duration can separate queueing from the instance.
        query: (query, label, options) => {
            const queuedFrom = performance.now();
            return withRequestLimit(
                options?.signal,
                () => send(url, textOf(query), label, options?.signal, performance.now() - queuedFrom),
                options?.priority ?? PRIORITY.window,
            );
        },
        curl: (query) => curlFor(url, textOf(query)),
    };
}

function textOf(query: Queryable | string): string {
    return typeof query === 'string' ? query : query.render();
}
