import { describe, expect, test } from 'vitest';

import { withoutBackground } from './backgroundMutations';
import { codeToEmptyEntry } from './mutationsOverTime';

function entry(code: string, proportion: number) {
    return { ...codeToEmptyEntry(code)!, count: 1, proportion };
}

const signature = {
    displayMutations: ['C241T', 'A23063T'],
    candidateMutations: ['C241T', 'G4184A', 'A23063T', 'T23011-'],
    jaccardIndices: { C241T: 0.9, A23063T: 0.95 },
};

describe('withoutBackground', () => {
    test('takes the mutations of at least 99% out of the signature, and keeps them apart', () => {
        const overallMutations = [
            entry('C241T', 0.99),
            entry('G4184A', 1),
            entry('A23063T', 0.989),
            entry('T23011-', 0.3),
        ];

        const result = withoutBackground(signature, overallMutations, [], {
            excludeNearlyFixed: true,
            excludeDeletions: false,
        });

        expect(result.displayMutations).toEqual(['A23063T']);
        expect(result.candidateMutations).toEqual(['A23063T', 'T23011-']);
        expect(result.jaccardIndices).toBe(signature.jaccardIndices);
        expect(result.excludedMutations.map(({ mutation, reason }) => [mutation.code, reason])).toEqual([
            ['C241T', { type: 'proportion' }],
            ['G4184A', { type: 'proportion' }],
        ]);
    });

    test('keeps the mutations on (nearly) all reads without `excludeNearlyFixed`', () => {
        const result = withoutBackground(signature, [entry('C241T', 1), entry('A23063T', 0.4)], [], {
            excludeNearlyFixed: false,
            excludeDeletions: false,
        });

        expect(result.displayMutations).toEqual(signature.displayMutations);
        expect(result.excludedMutations).toEqual([]);
    });

    test("takes the background lineages' mutations out, put down to the first lineage with them", () => {
        const overallMutations = [
            entry('C241T', 0.995),
            entry('G4184A', 0.5),
            entry('A23063T', 0.4),
            entry('T23011-', 0.3),
        ];

        const result = withoutBackground(
            signature,
            overallMutations,
            [
                { name: 'JN.1', mutations: ['C241T', 'G4184A'] },
                { name: 'BA.2', mutations: ['C241T', 'T23011-'] },
            ],
            { excludeNearlyFixed: true, excludeDeletions: false },
        );

        expect(result.displayMutations).toEqual(['A23063T']);
        expect(result.candidateMutations).toEqual(['A23063T']);
        expect(result.excludedMutations.map(({ mutation, reason }) => [mutation.code, reason])).toEqual([
            ['C241T', { type: 'lineage', lineage: 'JN.1' }],
            ['G4184A', { type: 'lineage', lineage: 'JN.1' }],
            ['T23011-', { type: 'lineage', lineage: 'BA.2' }],
        ]);
    });

    test('takes the deletions out with `excludeDeletions`, after the background lineages', () => {
        const result = withoutBackground(
            signature,
            [entry('C241T', 0.5), entry('G4184A', 1), entry('A23063T', 0.4), entry('T23011-', 1)],
            [{ name: 'JN.1', mutations: ['C241T'] }],
            { excludeNearlyFixed: true, excludeDeletions: true },
        );

        expect(result.candidateMutations).toEqual(['A23063T']);
        expect(result.excludedMutations.map(({ mutation, reason }) => [mutation.code, reason.type])).toEqual([
            ['C241T', 'lineage'],
            ['G4184A', 'proportion'],
            ['T23011-', 'deletion'],
        ]);
    });
});
