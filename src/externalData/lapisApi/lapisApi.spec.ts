import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchAggregated, LapisError, UnknownLapisError } from './lapisApi';

function stubFetch(respond: () => Promise<Response>) {
    vi.stubGlobal('fetch', vi.fn(respond));
}

afterEach(() => vi.unstubAllGlobals());

describe('fetchAggregated', () => {
    it('keeps the problem detail of a LAPIS error', async () => {
        const error = { type: 'about:blank', title: 'Bad Request', status: 400, detail: 'Unknown field: foo' };
        stubFetch(() =>
            Promise.resolve(new Response(JSON.stringify({ error }), { status: 400, statusText: 'Bad Request' })),
        );

        const result = fetchAggregated('https://lapis.example.org', {});

        await expect(result).rejects.toBeInstanceOf(LapisError);
        await expect(result).rejects.toMatchObject({
            status: 400,
            problemDetail: error,
            message: 'Bad Request: Unknown field: foo',
        });
    });

    it('keeps the status of an error without a problem detail', async () => {
        stubFetch(() => Promise.resolve(new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' })));

        await expect(fetchAggregated('https://lapis.example.org', {})).rejects.toMatchObject({
            name: 'UnknownLapisError',
            status: 502,
        });
    });

    it('reports a client error whose body is not JSON', async () => {
        stubFetch(() => Promise.resolve(new Response('<html>nope</html>', { status: 404, statusText: 'Not Found' })));

        await expect(fetchAggregated('https://lapis.example.org', {})).rejects.toMatchObject({
            name: 'UnknownLapisError',
            status: 404,
            message: 'Not Found: <html>nope</html>',
        });
    });

    it('says when LAPIS cannot be reached', async () => {
        stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

        const result = fetchAggregated('https://lapis.example.org', {});

        await expect(result).rejects.toBeInstanceOf(UnknownLapisError);
        await expect(result).rejects.toThrow('Failed to connect to LAPIS: Failed to fetch');
    });

    it('passes an abort on unchanged', async () => {
        const controller = new AbortController();
        const abort = new DOMException('The operation was aborted.', 'AbortError');
        stubFetch(() => {
            controller.abort(abort);
            return Promise.reject(abort);
        });

        await expect(fetchAggregated('https://lapis.example.org', {}, controller.signal)).rejects.toBe(abort);
    });
});
