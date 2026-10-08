import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ApiService, BackendError, BackendNotAvailable, UnknownBackendError } from './apiService';
import { testServer } from '../../../vitest.setup';

const BASE_URL = 'http://backend.example.org/';

describe('ApiService', () => {
    it('sends arrays as repeated query parameters and parses the answer', async () => {
        let requested: URL | undefined;
        testServer.use(
            http.get(`${BASE_URL}collections`, ({ request }) => {
                requested = new URL(request.url);
                return HttpResponse.json({ id: 7 });
            }),
        );

        const result = await new ApiService(BASE_URL).get({
            url: '/collections',
            requestParams: { tags: ['a', 'b'], organism: 'covid', userId: undefined },
            schema: z.object({ id: z.number() }),
        });

        expect(result).toEqual({ id: 7 });
        expect(requested?.search).toBe('?tags=a&tags=b&organism=covid');
    });

    it("throws a BackendError with the backend's problem detail", async () => {
        testServer.use(
            http.get(`${BASE_URL}collections/7`, () =>
                HttpResponse.json(
                    { title: 'Not Found', status: 404, detail: 'Collection 7 not found' },
                    { status: 404, headers: { 'x-request-id': 'request-1' } },
                ),
            ),
        );

        const result = new ApiService(BASE_URL).get({ url: '/collections/7', schema: z.unknown() });

        await expect(result).rejects.toBeInstanceOf(BackendError);
        await expect(result).rejects.toMatchObject({
            status: 404,
            message: 'Collection 7 not found',
            requestId: 'request-1',
        });
    });

    it('throws an UnknownBackendError for an error without a problem detail', async () => {
        testServer.use(http.get(`${BASE_URL}collections`, () => new HttpResponse('Bad Gateway', { status: 502 })));

        const result = new ApiService(BASE_URL).get({ url: '/collections', schema: z.unknown() });

        await expect(result).rejects.toBeInstanceOf(UnknownBackendError);
        await expect(result).rejects.toMatchObject({ status: 502 });
    });

    it('says when the backend cannot be reached', async () => {
        testServer.use(http.get(`${BASE_URL}collections`, () => HttpResponse.error()));

        await expect(new ApiService(BASE_URL).get({ url: '/collections', schema: z.unknown() })).rejects.toBeInstanceOf(
            BackendNotAvailable,
        );
    });
});
