import { afterEach, describe, expect, test, vi } from 'vitest';

import { query, RhydbError } from './query';

const ndjson = (body: string, status = 200) =>
    new Response(body, { status, headers: { 'content-type': 'application/x-ndjson', 'data-version': '1787819037' } });

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

/** Runs `work` while letting every retry delay elapse instantly. */
async function withoutWaiting<T>(work: () => Promise<T>): Promise<T> {
    vi.useFakeTimers();
    // Settled first, so a rejection is never left unhandled while the timers
    // are driven forward.
    const settled = work().then(
        (value) => () => value,
        (error: unknown) => () => {
            throw error;
        },
    );
    // Each pass lets a pending timer fire and the retry that follows it run.
    for (let pass = 0; pass < 5; pass++) {
        await vi.advanceTimersByTimeAsync(1000);
    }
    return (await settled)();
}

describe('query', () => {
    test('parses NDJSON and reads the data version', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ndjson('{"n":1}\n{"n":2}\n')));
        const result = await query('https://example.org/covid', 'default.limit(2)', 'Test');
        expect(result.rows).toEqual([{ n: 1 }, { n: 2 }]);
        expect(result.dataVersion).toBe('1787819037');
    });

    test('a dropped connection is retried, not surfaced as a failure', async () => {
        // A dropped connection surfaces as a failed fetch, not an HTTP error.
        const fetchMock = vi
            .fn()
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValue(ndjson('{"n":7}\n'));
        vi.stubGlobal('fetch', fetchMock);

        const result = await withoutWaiting(() => query('https://example.org/covid', 'default', 'Test'));
        expect(result.rows).toEqual([{ n: 7 }]);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    test('an instance still starting up is retried', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response('{"message":"loading"}', { status: 503 }))
            .mockResolvedValue(ndjson('{"n":1}\n'));
        vi.stubGlobal('fetch', fetchMock);

        await withoutWaiting(() => query('https://example.org/covid', 'default', 'Test'));
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    test('gives up after a bounded number of attempts and reports the failure', async () => {
        const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        vi.stubGlobal('fetch', fetchMock);

        await expect(withoutWaiting(() => query('https://example.org/covid', 'default', 'Test'))).rejects.toMatchObject(
            {
                kind: 'network',
            },
        );
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    test('a rejected query is not retried, since it will be rejected again', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('{"message":"parse error"}', { status: 400 }));
        vi.stubGlobal('fetch', fetchMock);

        await expect(query('https://example.org/covid', 'nonsense', 'Test')).rejects.toBeInstanceOf(RhydbError);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test('a query too expensive to answer is not retried, which would only double the load', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('<html>gateway timeout</html>', { status: 504 }));
        vi.stubGlobal('fetch', fetchMock);

        await expect(query('https://example.org/covid', 'default', 'Test')).rejects.toMatchObject({
            kind: 'too-expensive',
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test('an abort is not a failure to retry', async () => {
        const controller = new AbortController();
        const fetchMock = vi.fn().mockImplementation(() => {
            controller.abort();
            return Promise.reject(new DOMException('Aborted', 'AbortError'));
        });
        vi.stubGlobal('fetch', fetchMock);

        await expect(query('https://example.org/covid', 'default', 'Test', controller.signal)).rejects.toBeInstanceOf(
            DOMException,
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
