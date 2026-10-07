import { describe, expect, test } from 'vitest';

import { ampliconNumbersByMutation, mutationsByAmplicon } from './mutationsByAmplicon';
import { type Amplicon } from './primerBed';

function amplicon(number: number, insertStart: number, insertEnd: number): Amplicon {
    return {
        chrom: 'ref',
        number,
        pool: String(2 - (number % 2)),
        start: insertStart - 20,
        end: insertEnd + 20,
        insertStart,
        insertEnd,
    };
}

const amplicons = [amplicon(1, 50, 300), amplicon(2, 280, 550), amplicon(3, 530, 800)];

describe('mutationsByAmplicon', () => {
    test('groups the mutations by the insert they are in, in genome order and sorted by position', () => {
        const { groups, outside } = mutationsByAmplicon(['A600G', 'C100T', 'G400-', 'T60C'], amplicons);

        expect(groups.map(({ amplicon, mutations }) => [amplicon.number, mutations.map((m) => m.code)])).toEqual([
            [1, ['T60C', 'C100T']],
            [2, ['G400-']],
            [3, ['A600G']],
        ]);
        expect(outside).toEqual([]);
    });

    test('puts a mutation in the overlap of two inserts into both', () => {
        const { groups } = mutationsByAmplicon(['C290T'], amplicons);

        expect(groups.map(({ amplicon }) => amplicon.number)).toEqual([1, 2]);
    });

    test('leaves out what is in no insert, and what is not a nucleotide substitution or deletion', () => {
        const { groups, outside } = mutationsByAmplicon(
            ['C10T', 'A900G', 'S:N501Y', 'ins_100:AAA', 'C100T'],
            amplicons,
        );

        expect(groups.map(({ amplicon }) => amplicon.number)).toEqual([1]);
        expect(outside).toEqual(['C10T', 'A900G', 'S:N501Y', 'ins_100:AAA']);
    });
});

describe('ampliconNumbersByMutation', () => {
    test("gives each mutation its amplicons' numbers, two in an overlap, none outside the inserts", () => {
        expect(ampliconNumbersByMutation(['C100T', 'C290T', 'C10T', 'S:N501Y'], amplicons)).toEqual({
            C100T: [1],
            C290T: [1, 2],
        });
    });
});
