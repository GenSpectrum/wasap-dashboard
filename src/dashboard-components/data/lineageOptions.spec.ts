import { describe, expect, test } from 'vitest';

import { assembleLineageOptions } from './lineageOptions';
import type { LineageDefinitionResponse } from '../../lapisApi/LineageDefinition';

describe('assembleLineageOptions', () => {
    test('emits each lineage and its wildcard form, wildcard counts including sublineages', () => {
        const definitions: LineageDefinitionResponse = {
            A: {},
            'A.1': { parents: ['A'] },
            'A.1.1': { parents: ['A.1'] },
        };
        const counts = new Map([
            ['A', 5],
            ['A.1', 3],
            ['A.1.1', 2],
        ]);

        const options = assembleLineageOptions(counts, definitions);

        expect(options).toEqual([
            { lineage: 'A', count: 5 },
            { lineage: 'A*', count: 10 },
            { lineage: 'A.1', count: 3 },
            { lineage: 'A.1*', count: 5 },
            { lineage: 'A.1.1', count: 2 },
            { lineage: 'A.1.1*', count: 2 },
        ]);
    });

    test('a missing count is zero', () => {
        const options = assembleLineageOptions(new Map(), { X: {}, 'X.1': { parents: ['X'] } });
        expect(options).toEqual([
            { lineage: 'X', count: 0 },
            { lineage: 'X*', count: 0 },
            { lineage: 'X.1', count: 0 },
            { lineage: 'X.1*', count: 0 },
        ]);
    });

    test('options are sorted with the wildcard before the dot for a shared prefix', () => {
        const options = assembleLineageOptions(new Map(), {
            A: {},
            'A.1': { parents: ['A'] },
        });
        expect(options.map((option) => option.lineage)).toEqual(['A', 'A*', 'A.1', 'A.1*']);
    });
});
