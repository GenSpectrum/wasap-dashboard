import { describe, expect, test } from 'vitest';

import {
    overallMutationsQuery,
    positionOverTimeQuery,
    readOverallMutations,
    readPositionOverTime,
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

describe('overallMutationsQuery (metadata: which mutations get a row)', () => {
    test('nucleotide: mutations() with the proportion floor and trimmed fields', () => {
        expect(overallMutationsQuery(schema, {}, { sequenceType: 'nucleotide' }).render()).toBe(
            `default.mutations(minProportion := 0.001, fields := ${fields})`,
        );
    });

    test('amino acid: aminoAcidMutations(), gene-restricted, over the shown span', () => {
        expect(
            overallMutationsQuery(
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

describe('positionOverTimeQuery (page: one position, symbols per day)', () => {
    test('maps the symbol at one position, then groups by the bare grouping-date + sym columns', () => {
        expect(
            positionOverTimeQuery(
                schema,
                { locationName: 'Zürich (ZH)' },
                { sequenceName: 'main', position: 241 },
            ).render(),
        ).toBe(
            "default.filter(locationName = 'Zürich (ZH)')" +
                '.map({sym := main.at(241)}).groupBy({count := count()}, {date, sym})',
        );
    });

    test('no location narrows nothing; amino acid uses the gene column', () => {
        expect(positionOverTimeQuery(schema, {}, { sequenceName: 'S', position: 19 }).render()).toBe(
            'default.map({sym := S.at(19)}).groupBy({count := count()}, {date, sym})',
        );
    });

    // Regression: the older SILO version behind rsv-a / rsv-b (0.12.1) rejects
    // an inline `:=` assignment in a groupBy column list outright (400,
    // "expected set literal") — not a timeout, as previously assumed. Verified
    // live that the map()-first / bare-column form above parses and runs
    // sub-second on both that version and covid's newer one.
    test('the DATE32-grouping instance uses the same map()-first shape', () => {
        const rsvSchema: SiloSchema = {
            table: 'default',
            locationName: 'locationName',
            samplingDate: 'samplingDate',
            groupingDate: 'samplingDate',
            groupingDateIsDictionary: false,
            nucleotideSequence: 'main',
        };
        expect(
            positionOverTimeQuery(
                rsvSchema,
                { locationName: 'Geneva' },
                { sequenceName: 'main', position: 848 },
            ).render(),
        ).toBe(
            "default.filter(locationName = 'Geneva')" +
                '.map({sym := main.at(848)}).groupBy({count := count()}, {samplingDate, sym})',
        );
    });
});

describe('readers', () => {
    test('readOverallMutations maps the rows, null sequenceName through', () => {
        expect(
            readOverallMutations([
                { mutationFrom: 'C', mutationTo: 'T', sequenceName: 'main', position: 241, count: 90, coverage: 100 },
                { mutationFrom: 'G', mutationTo: '-', sequenceName: null, position: 510, count: 5, coverage: 10 },
            ]),
        ).toEqual([
            { mutationFrom: 'C', mutationTo: 'T', sequenceName: 'main', position: 241, count: 90, coverage: 100 },
            { mutationFrom: 'G', mutationTo: '-', sequenceName: null, position: 510, count: 5, coverage: 10 },
        ]);
    });

    test('readPositionOverTime carries a null symbol through (an absent read)', () => {
        expect(
            readPositionOverTime(
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
