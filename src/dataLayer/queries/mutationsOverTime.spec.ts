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
            "data.filter(locationName = 'Basel (BS)' && samplingDate >= '2026-06-01'::date && samplingDate <= '2026-06-30'::date)" +
                `.aminoAcidMutations(minProportion := 0.001, fields := ${fields})`,
        );
    });
});

describe('positionOverTimeQuery (page: one position, symbols per day)', () => {
    test('maps the symbol at one position, then groups by the bare sampling-date + sym columns', () => {
        expect(
            positionOverTimeQuery(
                schema,
                { locationNames: ['Zürich (ZH)'] },
                { sequenceName: 'main', position: 241 },
            ).render(),
        ).toBe(
            "data.filter(locationName = 'Zürich (ZH)')" +
                '.map({sym := main.at(241)}).group(by := {samplingDate, sym}, aggs := {count := count()})',
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
            "data.filter(samplingDate >= '2026-06-03'::date && samplingDate <= '2026-06-30'::date)" +
                '.map({sym := main.at(241)}).group(by := {samplingDate, sym}, aggs := {count := count()})',
        );
    });

    test('no location narrows nothing; amino acid uses the gene column', () => {
        expect(positionOverTimeQuery(schema, {}, { sequenceName: 'S', position: 19 }).render()).toBe(
            'data.map({sym := S.at(19)}).group(by := {samplingDate, sym}, aggs := {count := count()})',
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
        `.map({sym := main.at(${position})}).group(by := {samplingDate, sym}, aggs := {count := count()})` +
        `.map({day := samplingDate, sequenceName := 'main', position := ${position}})` +
        ".filter(day >= '2026-06-03'::date && day <= '2026-06-30'::date)" +
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

    test('without dates or locations, nothing is filtered', () => {
        expect(positionsOverTimeQuery(schema, {}, [{ sequenceName: 'S', position: 19 }]).render()).toBe(
            'data.map({sym := S.at(19)}).group(by := {samplingDate, sym}, aggs := {count := count()})' +
                ".map({day := samplingDate, sequenceName := 'S', position := 19}).project({day, sym, count, sequenceName, position})",
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
