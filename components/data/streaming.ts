/**
 * Many requests for one answer, published as they land.
 *
 * Where an answer takes one request per item — per amplicon, per position, per
 * position of a whole genome — this runs them and publishes what has arrived
 * so far, so nothing waits on the last of a few hundred requests.
 *
 * A bounded pool, an abort that cancels whatever has not been sent, and a
 * republish on a timer rather than on every answer.
 *
 * Two shapes, chosen by the caller:
 *
 * - **Keyed**, where an item's answer stands on its own. An item that has not
 *   answered has no entry; `complete` says whether a missing entry means
 *   unanswered or measured-as-nothing.
 * - **A prefix**, in the order the questions were asked, up to the first one
 *   still outstanding. A partial result is then always in order.
 *
 * Use this where the items number in the thousands. `useQueries` caches each
 * item separately, which suits a few hundred, but creates one query observer
 * per item.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { pool } from './pool';
import { RhydbError } from '../rhydb/query';

/** How often a partially filled result is published to React. */
const PUBLISH_INTERVAL_MS = 200;

export type Fanout<T, R> = {
    /**
     * Identifies the whole run. The work restarts when this changes, and is
     * skipped while it is undefined, which is how a caller waits for an input
     * it does not have yet.
     */
    key: string | undefined;
    items: readonly T[] | undefined;
    concurrency: number;
    /**
     * Where a finished result is kept, as a TanStack query key.
     *
     * Given, a completed result is remembered and redrawn without measuring
     * again, which matters when the run is thousands of requests. Omitted, the
     * work runs afresh every time `key` changes.
     */
    cache?: readonly unknown[];
    run: (item: T, index: number, signal: AbortSignal) => Promise<R>;
};

type Progress = { counted: number; total: number; complete: boolean };

/** Answers so far, keyed as the caller keys them. */
export type StreamedResults<K, V> = Progress & { values: Map<K, V> };

/** Answers in the order the questions were asked, up to the first outstanding one. */
export type StreamedPrefix<V> = Progress & { prefix: V[] };

/**
 * Fan out, publishing answers by key.
 *
 * `run` returns the key it answers for, because an item is not always its own
 * key — an amplicon answers under its index.
 */
export function useStreamedResults<T, K, V>(
    options: Fanout<T, { key: K; value: V }>,
): { data: StreamedResults<K, V> | undefined; error: unknown } {
    return useFanout(options, (answers, progress) => ({
        values: new Map(answers.filter((answer) => answer !== undefined).map((answer) => [answer!.key, answer!.value])),
        ...progress,
    }));
}

/**
 * The answers up to the first question still outstanding.
 *
 * A pool answers in completion order, so each result is placed at its own
 * index and only the run before the first hole is published. A partial curve
 * is then always in order and always ends where the measurement has reached.
 */
export function answeredPrefix<V>(answers: readonly (V | undefined)[]): V[] {
    const prefix: V[] = [];
    for (const answer of answers) {
        if (answer === undefined) {
            break;
        }
        prefix.push(answer);
    }
    return prefix;
}

/** Fan out, publishing answers in request order. */
export function useStreamedPrefix<T, V>(
    options: Fanout<T, V>,
): { data: StreamedPrefix<V> | undefined; error: unknown } {
    return useFanout(options, (answers, progress) => ({ prefix: answeredPrefix(answers), ...progress }));
}

function useFanout<T, R, S extends Progress>(
    { key, items, concurrency, cache, run }: Fanout<T, R>,
    publish: (answers: (R | undefined)[], progress: Progress) => S,
): { data: S | undefined; error: unknown } {
    const [state, setState] = useState<S | undefined>(undefined);
    const [error, setError] = useState<unknown>(undefined);
    const queryClient = useQueryClient();

    useEffect(() => {
        setError(undefined);
        if (key === undefined || items === undefined) {
            setState(undefined);
            return;
        }

        const total = items.length;
        const progress = (counted: number, complete: boolean): Progress => ({ counted, total, complete });

        // Remembered from a previous run, where the caller asked for that.
        const remembered = cache === undefined ? undefined : queryClient.getQueryData<(R | undefined)[]>(cache);
        if (remembered !== undefined) {
            setState(publish(remembered, progress(remembered.length, true)));
            return;
        }

        // Sparse and indexed by the item's place in the list, so the published
        // shape does not depend on the order the pool answered in.
        const answers: (R | undefined)[] = new Array<R | undefined>(total);
        let counted = 0;
        let published = -1;
        setState(publish(answers, progress(0, total === 0)));

        const controller = new AbortController();
        const timer = setInterval(() => {
            if (counted !== published) {
                published = counted;
                setState(publish(answers, progress(counted, false)));
            }
        }, PUBLISH_INTERVAL_MS);

        pool(
            [...items],
            concurrency,
            async (item, index, signal) => {
                answers[index] = await run(item, index, signal);
                counted++;
            },
            controller.signal,
        )
            .then(() => {
                if (controller.signal.aborted) {
                    return;
                }
                if (cache !== undefined) {
                    // Kept for as long as the page lives.
                    queryClient.setQueryData(cache, answers, { updatedAt: Date.now() });
                    queryClient.setQueryDefaults(cache, { gcTime: Infinity, staleTime: Infinity });
                }
                setState(publish(answers, progress(counted, true)));
            })
            .catch((cause: unknown) => {
                // An abort is this effect being cleaned up, not a failure to report.
                if (controller.signal.aborted) {
                    return;
                }
                setError(cause instanceof RhydbError || cause instanceof Error ? cause : new Error(String(cause)));
            })
            .finally(() => clearInterval(timer));

        return () => {
            clearInterval(timer);
            controller.abort();
        };
        // The key stands for every input the result depends on.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return { data: state, error };
}
