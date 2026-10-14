import { describe, expect, test } from 'vitest';

import { ampliconPositionsQuery, readAmpliconPositionRows } from './ampliconPositions';
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

describe('ampliconPositionsQuery', () => {
    test('nucleotide: negates an exact-N match, scans with minProportion 0', () => {
        expect(ampliconPositionsQuery(schema, {}, { sequenceName: 'main', position: 250 }, 'nucleotide').render()).toBe(
            "default.filter(!nucleotideEquals(position := 250, symbol := 'N', sequenceName := 'main'))" +
                '.mutations(minProportion := 0, sequenceNames := {main}, fields := {mutationFrom, mutationTo, position, count, coverage})',
        );
    });

    test('amino acid: negates an exact-X match against the gene column, and combines with the base filter', () => {
        expect(
            ampliconPositionsQuery(
                schema,
                { locationName: 'Basel (BS)' },
                { sequenceName: 'S', position: 501 },
                'amino acid',
            ).render(),
        ).toBe(
            "default.filter(locationName = 'Basel (BS)' && !aminoAcidEquals(position := 501, symbol := 'X', sequenceName := 'S'))" +
                '.aminoAcidMutations(minProportion := 0, sequenceNames := {S}, fields := {mutationFrom, mutationTo, position, count, coverage})',
        );
    });
});

describe('readAmpliconPositionRows', () => {
    test('reads position, ref/alt symbols, count and coverage', () => {
        expect(
            readAmpliconPositionRows([
                { mutationFrom: 'C', mutationTo: 'T', position: 23403, count: 5, coverage: 100 },
            ]),
        ).toEqual([{ position: 23403, mutationFrom: 'C', mutationTo: 'T', count: 5, coverage: 100 }]);
    });
});
