import { describe, expect, test } from 'vitest';

import { positionBySampleQuery, readPositionBySample } from './positionBySample';
import type { SiloSchema } from './schema';

const schema: SiloSchema = {
    table: 'default',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

describe('positionBySampleQuery', () => {
    test('maps the symbol at one position, then groups by sample and sym, unfiltered', () => {
        expect(positionBySampleQuery(schema, 'main', 2083).render()).toBe(
            'default.map({sym := main.at(2083)}).groupBy({count := count()}, {sampleId, sym})',
        );
    });
});

describe('readPositionBySample', () => {
    test('reads the sample, symbol and count of each row', () => {
        expect(readPositionBySample([{ sampleId: 'A1', sym: 'N', count: 3 }], 'sampleId')).toEqual([
            { sampleId: 'A1', sym: 'N', count: 3 },
        ]);
    });
});
