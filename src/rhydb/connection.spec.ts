import { describe, expect, test, vi, afterEach } from 'vitest';

import { connect } from './connection';
import { field, str } from './expression';
import { count } from './functions';

const connection = connect({ url: 'https://example.org/covid/', table: 'default' });

afterEach(() => vi.unstubAllGlobals());

describe('a connection', () => {
    test('carries the two things every request and every cache entry needs', () => {
        expect(connection.url).toBe('https://example.org/covid/');
        expect(connection.table).toBe('default');
        expect(connection.key).toEqual(['https://example.org/covid/', 'default']);
        expect(connection.id).toBe('https://example.org/covid/|default');
    });

    test('two instances never share a cache entry', () => {
        const other = connect({ url: 'https://example.org/covid/', table: 'other' });
        expect(other.id).not.toBe(connection.id);
        expect([...other.key]).not.toEqual([...connection.key]);
    });

    test('starts a query at its own table', () => {
        expect(connection.root().groupBy({ n: count() }, ['sampleId']).render()).toBe(
            'default.groupBy({n := count()}, {sampleId})',
        );
    });

    test('sends a relation and text alike, through the one owner', async () => {
        const fetched: RequestInit[] = [];
        vi.stubGlobal(
            'fetch',
            vi.fn((_url: string, init: RequestInit) => {
                fetched.push(init);
                return Promise.resolve(new Response('{"n":1}\n', { status: 200 }));
            }),
        );

        await connection.query(connection.root().filter(field('sampleId').eq(str('S1'))), 'Test');
        await connection.query('default.limit(1)', 'Test');

        expect(fetched.map((init) => init.body)).toEqual(["default.filter(sampleId = 'S1')", 'default.limit(1)']);
        for (const init of fetched) {
            expect(init.headers).toEqual({ 'Content-Type': 'text/plain', Accept: 'application/x-ndjson' });
        }
    });

    test('offers the curl line for what it would send', () => {
        const command = connection.curl(connection.root().limit(1));
        expect(command).toContain("'https://example.org/covid/query'");
        expect(command).toContain("--data-binary 'default.limit(1)'");
        expect(command).toContain("-H 'Content-Type: text/plain'");
    });
});
