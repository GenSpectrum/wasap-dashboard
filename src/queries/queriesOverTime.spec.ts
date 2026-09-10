import { describe, expect, test } from 'vitest';

import { coverageOverTimeQuery, countOverTimeQuery, translateGenomeFilter } from './queriesOverTime';
import type { SiloSchema } from './schema';
import type { SiloFilterExpression } from './siloFilterExpression';

const schema: SiloSchema = {
    table: 'default',
    locationName: 'locationName',
    samplingDate: 'samplingDate',
    groupingDate: 'date',
    groupingDateIsDictionary: true,
    nucleotideSequence: 'main',
};

const render = (node: SiloFilterExpression) => translateGenomeFilter(schema, node).render();

describe('translateGenomeFilter', () => {
    test('nucleotide equals: fills the sequence name when the node omits it', () => {
        expect(render({ type: 'NucleotideEquals', position: 241, symbol: 'T' })).toBe(
            "nucleotideEquals(position := 241, symbol := 'T', sequenceName := 'main')",
        );
        expect(render({ type: 'NucleotideEquals', sequenceName: null, position: 241, symbol: 'T' })).toBe(
            "nucleotideEquals(position := 241, symbol := 'T', sequenceName := 'main')",
        );
    });

    test('amino-acid equals and has-mutation keep their gene', () => {
        expect(render({ type: 'AminoAcidEquals', sequenceName: 'S', position: 501, symbol: 'Y' })).toBe(
            "aminoAcidEquals(position := 501, symbol := 'Y', sequenceName := 'S')",
        );
        expect(render({ type: 'HasAminoAcidMutation', sequenceName: 'S', position: 484 })).toBe(
            "hasAAMutation(position := 484, sequenceName := 'S')",
        );
    });

    test('has-nucleotide-mutation and insertion-contains default the sequence', () => {
        expect(render({ type: 'HasNucleotideMutation', position: 3037 })).toBe(
            "hasMutation(position := 3037, sequenceName := 'main')",
        );
        expect(render({ type: 'InsertionContains', position: 22204, value: 'GAGCCAGAA' })).toBe(
            "insertionContains(position := 22204, value := 'GAGCCAGAA', sequenceName := 'main')",
        );
    });

    test('True renders the literal', () => {
        expect(render({ type: 'True' })).toBe('true');
    });

    test('And / Or / Not compose, Or is parenthesised inside And', () => {
        const expr: SiloFilterExpression = {
            type: 'And',
            children: [
                { type: 'NucleotideEquals', sequenceName: 'main', position: 241, symbol: 'T' },
                {
                    type: 'Or',
                    children: [
                        { type: 'NucleotideEquals', sequenceName: 'main', position: 3037, symbol: 'T' },
                        {
                            type: 'Not',
                            child: { type: 'HasNucleotideMutation', sequenceName: 'main', position: 14408 },
                        },
                    ],
                },
            ],
        };
        expect(render(expr)).toBe(
            "nucleotideEquals(position := 241, symbol := 'T', sequenceName := 'main') && " +
                "(nucleotideEquals(position := 3037, symbol := 'T', sequenceName := 'main') || " +
                "!hasMutation(position := 14408, sequenceName := 'main'))",
        );
    });

    test('Maybe wraps its child', () => {
        expect(render({ type: 'Maybe', child: { type: 'NucleotideEquals', position: 241, symbol: 'T' } })).toBe(
            "maybe(nucleotideEquals(position := 241, symbol := 'T', sequenceName := 'main'))",
        );
    });

    test('N-Of carries the count, the matchers, and matchExactly', () => {
        const expr: SiloFilterExpression = {
            type: 'N-Of',
            numberOfMatchers: 2,
            matchExactly: true,
            children: [
                { type: 'NucleotideEquals', sequenceName: 'main', position: 1, symbol: 'T' },
                { type: 'NucleotideEquals', sequenceName: 'main', position: 2, symbol: 'A' },
                { type: 'NucleotideEquals', sequenceName: 'main', position: 3, symbol: 'G' },
            ],
        };
        expect(render(expr)).toBe(
            "nOf(2, {nucleotideEquals(position := 1, symbol := 'T', sequenceName := 'main'), " +
                "nucleotideEquals(position := 2, symbol := 'A', sequenceName := 'main'), " +
                "nucleotideEquals(position := 3, symbol := 'G', sequenceName := 'main')}, matchExactly := true)",
        );
    });

    test('throws on a node validateGenomeOnly would have rejected', () => {
        expect(() => translateGenomeFilter(schema, { type: 'StringEquals', column: 'country', value: 'USA' })).toThrow(
            /cannot translate/,
        );
    });
});

describe('countOverTimeQuery / coverageOverTimeQuery', () => {
    const node: SiloFilterExpression = { type: 'NucleotideEquals', sequenceName: 'main', position: 241, symbol: 'T' };

    test('count: the query, scoped, grouped by the dictionary date column', () => {
        expect(countOverTimeQuery(schema, { locationName: 'Zürich (ZH)' }, node).render()).toBe(
            "default.filter(locationName = 'Zürich (ZH)' && " +
                "nucleotideEquals(position := 241, symbol := 'T', sequenceName := 'main'))" +
                '.groupBy({n := count()}, {date})',
        );
    });

    test('coverage: q || !maybe(q), scoped, grouped by date', () => {
        expect(
            coverageOverTimeQuery(
                schema,
                { samplingDateFrom: '2026-06-01', samplingDateTo: '2026-06-30' },
                node,
            ).render(),
        ).toBe(
            "default.filter(date >= '2026-06-01' && date <= '2026-06-30' && " +
                "(nucleotideEquals(position := 241, symbol := 'T', sequenceName := 'main') || " +
                "!maybe(nucleotideEquals(position := 241, symbol := 'T', sequenceName := 'main'))))" +
                '.groupBy({n := count()}, {date})',
        );
    });

    test('no filter: the query stands alone', () => {
        expect(countOverTimeQuery(schema, {}, { type: 'True' }).render()).toBe(
            'default.filter(true).groupBy({n := count()}, {date})',
        );
    });
});
