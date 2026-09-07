import { describe, expect, test } from 'vitest';

import {
    mutationSpectrumQuery,
    positionPileupQuery,
    readMutationSpectrum,
    readPositionPileup,
} from './mutationsOverTime';
import type { SiloSchema } from './schema';

const schema: SiloSchema = {
    table: 'default',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
};

const fields = '{mutationFrom, mutationTo, sequenceName, position, count, coverage}';

describe('mutationSpectrumQuery (phase 1 row list)', () => {
    test('nucleotide: mutations() with the proportion floor and trimmed fields', () => {
        expect(mutationSpectrumQuery(schema, {}, { sequenceType: 'nucleotide' }).render()).toBe(
            `default.mutations(minProportion := 0.001, fields := ${fields})`,
        );
    });

    test('amino acid: aminoAcidMutations(), gene-restricted, over the shown span', () => {
        expect(
            mutationSpectrumQuery(
                schema,
                { locationName: 'Basel (BS)', samplingDateFrom: '2026-06-01', samplingDateTo: '2026-06-30' },
                { sequenceType: 'amino acid', sequenceNames: ['S'] },
            ).render(),
        ).toBe(
            "default.filter(locationName = 'Basel (BS)' && date >= '2026-06-01' && date <= '2026-06-30')" +
                `.aminoAcidMutations(minProportion := 0.001, sequenceNames := {S}, fields := ${fields})`,
        );
    });
});

describe('positionPileupQuery (phase 2 per-position pileup)', () => {
    test('groups the symbol at one position by the grouping-date column, location only', () => {
        expect(
            positionPileupQuery(
                schema,
                { locationName: 'Zürich (ZH)' },
                { sequenceName: 'main', position: 241 },
            ).render(),
        ).toBe(
            "default.filter(locationName = 'Zürich (ZH)')" +
                '.groupBy({count := count()}, {date := date, sym := main.at(241)})',
        );
    });

    test('no location narrows nothing; amino acid uses the gene column', () => {
        expect(positionPileupQuery(schema, {}, { sequenceName: 'S', position: 19 }).render()).toBe(
            'default.groupBy({count := count()}, {date := date, sym := S.at(19)})',
        );
    });
});

describe('readers', () => {
    test('readMutationSpectrum maps the rows, null sequenceName through', () => {
        expect(
            readMutationSpectrum([
                { mutationFrom: 'C', mutationTo: 'T', sequenceName: 'main', position: 241, count: 90, coverage: 100 },
                { mutationFrom: 'G', mutationTo: '-', sequenceName: null, position: 510, count: 5, coverage: 10 },
            ]),
        ).toEqual([
            { mutationFrom: 'C', mutationTo: 'T', sequenceName: 'main', position: 241, count: 90, coverage: 100 },
            { mutationFrom: 'G', mutationTo: '-', sequenceName: null, position: 510, count: 5, coverage: 10 },
        ]);
    });

    test('readPositionPileup carries a null symbol through (an absent read)', () => {
        expect(
            readPositionPileup(
                [
                    { date: '2026-06-01', sym: 'T', count: 900 },
                    { date: '2026-06-01', sym: 'N', count: 50 },
                    { date: '2026-06-02', sym: null, count: 7 },
                ],
                'date',
            ),
        ).toEqual([
            { date: '2026-06-01', sym: 'T', count: 900 },
            { date: '2026-06-01', sym: 'N', count: 50 },
            { date: '2026-06-02', sym: null, count: 7 },
        ]);
    });
});
