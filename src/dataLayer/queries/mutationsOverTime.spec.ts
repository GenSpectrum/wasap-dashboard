import { describe, expect, test } from 'vitest';

import {
    overallMutationsQuery,
    positionOverTimeQuery,
    positionsOverTimeQuery,
    readOverallMutations,
    readPositionOverTime,
    readPositionsOverTime,
} from './mutationsOverTime';
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

const fields = '{mutationFrom, mutationTo, sequenceName, position, count, coverage}';

describe('overallMutationsQuery (metadata: which mutations get a row)', () => {
    test('nucleotide: mutations() with the proportion floor and trimmed fields', () => {
        expect(overallMutationsQuery(schema, {}, { sequenceType: 'nucleotide' }).render()).toBe(
            `data.mutations(minProportion := 0.001, fields := ${fields})`,
        );
    });

    test('amino acid: aminoAcidMutations(), over the shown span', () => {
        expect(
            overallMutationsQuery(
                schema,
                { locationNames: ['Basel (BS)'], samplingDateFrom: '2026-06-01', samplingDateTo: '2026-06-30' },
                { sequenceType: 'amino acid' },
            ).render(),
        ).toBe(
            "data.filter(locationName = 'Basel (BS)' && date >= '2026-06-01' && date <= '2026-06-30')" +
                `.aminoAcidMutations(minProportion := 0.001, fields := ${fields})`,
        );
    });
});

describe('positionOverTimeQuery (page: one position, symbols per day)', () => {
    test('maps the symbol at one position, then groups by the bare grouping-date + sym columns', () => {
        expect(
            positionOverTimeQuery(
                schema,
                { locationNames: ['Zürich (ZH)'] },
                { sequenceName: 'main', position: 241 },
            ).render(),
        ).toBe(
            "data.filter(locationName = 'Zürich (ZH)')" +
                '.map({sym := main.at(241)}).group(by := {date, sym}, aggs := {count := count()})',
        );
    });

    test('is narrowed to the sampling dates', () => {
        expect(
            positionOverTimeQuery(
                schema,
                { samplingDateFrom: '2026-06-03', samplingDateTo: '2026-06-30' },
                { sequenceName: 'main', position: 241 },
            ).render(),
        ).toBe(
            "data.filter(date >= '2026-06-03' && date <= '2026-06-30')" +
                '.map({sym := main.at(241)}).group(by := {date, sym}, aggs := {count := count()})',
        );
    });

    test('no location narrows nothing; amino acid uses the gene column', () => {
        expect(positionOverTimeQuery(schema, {}, { sequenceName: 'S', position: 19 }).render()).toBe(
            'data.map({sym := S.at(19)}).group(by := {date, sym}, aggs := {count := count()})',
        );
    });

    // Regression: the older RhyDB version behind rsv-a / rsv-b (0.12.1) rejects
    // an inline `:=` assignment in a groupBy column list outright (400,
    // "expected set literal") — not a timeout, as previously assumed. Verified
    // live that the map()-first / bare-column form above parses and runs
    // sub-second on both that version and covid's newer one.
    test('the DATE32-grouping instance uses the same map()-first shape', () => {
        const rsvSchema: RhydbSchema = {
            table: 'data',
            locationName: 'locationName',
            samplingDate: 'samplingDate',
            groupingDate: 'samplingDate',
            groupingDateIsDictionary: false,
            nucleotideSequence: 'main',
            sampleId: 'sampleId',
            batchId: 'batchId',
        };
        expect(
            positionOverTimeQuery(
                rsvSchema,
                { locationNames: ['Geneva'] },
                { sequenceName: 'main', position: 848 },
            ).render(),
        ).toBe(
            "data.filter(locationName = 'Geneva')" +
                '.map({sym := main.at(848)}).group(by := {samplingDate, sym}, aggs := {count := count()})',
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

describe('positionsOverTimeQuery (many positions in one unionall)', () => {
    const part = (position: number) =>
        "data.filter(locationName = 'Zürich (ZH)')" +
        `.map({sym := main.at(${position})}).group(by := {date, sym}, aggs := {count := count()})` +
        `.map({day := date, sequenceName := 'main', position := ${position}})` +
        ".filter(day >= '2026-06-03' && day <= '2026-06-30')" +
        '.project({day, sym, count, sequenceName, position})';

    test('filters by location in every part, by date after the group, and tags each part with its target', () => {
        expect(
            positionsOverTimeQuery(
                schema,
                { locationNames: ['Zürich (ZH)'], samplingDateFrom: '2026-06-03', samplingDateTo: '2026-06-30' },
                [
                    { sequenceName: 'main', position: 241 },
                    { sequenceName: 'main', position: 3037 },
                ],
            ).render(),
        ).toBe(`${part(241)}.unionall(${part(3037)})`);
    });

    test('against a DATE32 grouping column the date bounds carry a ::date cast', () => {
        expect(
            positionsOverTimeQuery(
                { ...schema, groupingDate: 'samplingDate', groupingDateIsDictionary: false },
                { samplingDateFrom: '2026-06-03' },
                [{ sequenceName: 'main', position: 241 }],
            ).render(),
        ).toBe(
            'data.map({sym := main.at(241)})' +
                '.group(by := {samplingDate, sym}, aggs := {count := count()})' +
                ".map({day := samplingDate, sequenceName := 'main', position := 241}).filter(day >= '2026-06-03'::date)" +
                '.project({day, sym, count, sequenceName, position})',
        );
    });

    test('without dates or locations, nothing is filtered', () => {
        expect(positionsOverTimeQuery(schema, {}, [{ sequenceName: 'S', position: 19 }]).render()).toBe(
            'data.map({sym := S.at(19)}).group(by := {date, sym}, aggs := {count := count()})' +
                ".map({day := date, sequenceName := 'S', position := 19}).project({day, sym, count, sequenceName, position})",
        );
    });
});

describe('readPositionsOverTime', () => {
    test('reads each row with its target', () => {
        expect(
            readPositionsOverTime([{ day: '2026-06-03', sym: 'T', count: 5, sequenceName: 'S', position: 484 }]),
        ).toEqual([{ date: '2026-06-03', sym: 'T', count: 5, sequenceName: 'S', position: 484 }]);
    });
});
