import { describe, expect, test } from 'vitest';

import { positionsBySampleQuery, readPositionsBySample } from './positionBySample';
import type { RhydbSchema } from './schema';

const schema: RhydbSchema = {
    table: 'data',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
    sampleId: 'sampleId',
    batchId: 'batchId',
};

describe('positionsBySampleQuery', () => {
    test('tags each row with its position after the group, in one unionall', () => {
        const part = (position: number) =>
            `data.map({sampleId := sampleId, sym := main.at(${position})})` +
            '.group(by := {sampleId, sym}, aggs := {count := count()})' +
            `.map({sampleId := sampleId, sym := sym, count := count, position := ${position}})`;
        expect(positionsBySampleQuery(schema, 'main', [241, 2083]).render()).toBe(
            `${part(241)}.unionall(${part(2083)})`,
        );
    });
});

describe('readPositionsBySample', () => {
    test('reads the sample, symbol, count and position of each row', () => {
        expect(readPositionsBySample([{ sampleId: 'A1', sym: null, count: 3, position: 241 }], 'sampleId')).toEqual([
            { sampleId: 'A1', sym: null, count: 3, position: 241 },
        ]);
    });
});
