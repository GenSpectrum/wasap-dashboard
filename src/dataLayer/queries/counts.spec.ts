import { describe, expect, test } from 'vitest';

import { readNamedCounts } from './counts';

describe('readNamedCounts', () => {
    test('maps the named column and n, dropping a blank name', () => {
        expect(
            readNamedCounts(
                [
                    { locationName: 'Basel (BS)', n: 10 },
                    { locationName: '', n: 3 },
                    { locationName: 'Zürich (ZH)', n: 20 },
                ],
                'locationName',
            ),
        ).toEqual([
            { name: 'Basel (BS)', count: 10 },
            { name: 'Zürich (ZH)', count: 20 },
        ]);
    });
});
