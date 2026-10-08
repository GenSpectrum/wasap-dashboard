import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
    booleanParam,
    enumParam,
    listParam,
    numberParam,
    optional,
    parseUrlParams,
    stringParam,
    type UrlParams,
    writeUrlParams,
} from './urlParams';

type Settings = {
    mode: 'test';
    kind: 'a' | 'b';
    name: string;
    variant: string | undefined;
    count: number;
    flag: boolean;
    lineages: string[];
};

const params: UrlParams<Settings> = {
    kind: enumParam(z.enum(['a', 'b'])),
    name: stringParam,
    variant: optional(stringParam),
    count: numberParam({ min: 0, integer: true }),
    flag: booleanParam,
    lineages: listParam,
};

const defaults: Settings = {
    mode: 'test',
    kind: 'a',
    name: 'default',
    variant: 'XFG*',
    count: 10,
    flag: true,
    lineages: ['JN.1'],
};

const parse = (query: string) => parseUrlParams(new URLSearchParams(query), params, defaults);
const write = (settings: Settings) => {
    const search = new URLSearchParams();
    writeUrlParams(search, params, settings, defaults);
    return search.toString();
};

describe('parseUrlParams', () => {
    it('takes the default for what is missing', () => {
        expect(parse('')).toEqual(defaults);
    });

    it('reads the values', () => {
        expect(parse('kind=b&name=x&variant=BA.2&count=3&flag=false&lineages=A|B')).toEqual({
            mode: 'test',
            kind: 'b',
            name: 'x',
            variant: 'BA.2',
            count: 3,
            flag: false,
            lineages: ['A', 'B'],
        });
    });

    it('takes the default for invalid values', () => {
        expect(parse('kind=c&name=&count=abc&flag=yes')).toEqual(defaults);
        expect(parse('count=-1').count).toBe(10);
        expect(parse('count=1.5').count).toBe(10);
        expect(parse('count=').count).toBe(10);
        expect(parse('mode=other').mode).toBe('test');
    });

    it('reads an empty value as explicitly empty, not as the default', () => {
        expect(parse('variant=').variant).toBeUndefined();
        expect(parse('lineages=').lineages).toEqual([]);
    });
});

describe('writeUrlParams', () => {
    it('leaves out what is the default', () => {
        expect(write(defaults)).toBe('');
        expect(write({ ...defaults, count: 3 })).toBe('count=3');
    });

    it('writes explicitly empty values as empty', () => {
        expect(write({ ...defaults, variant: undefined, lineages: [] })).toBe('variant=&lineages=');
    });

    it('is read back the same', () => {
        const settings: Settings[] = [
            defaults,
            { ...defaults, kind: 'b', name: 'x', count: 0, flag: false },
            { ...defaults, variant: undefined, lineages: [] },
            { ...defaults, variant: 'BA.2*', lineages: ['A', 'B'] },
        ];
        for (const value of settings) {
            expect(parse(write(value))).toEqual(value);
        }
    });
});
