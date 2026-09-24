import { describe, expect, it } from 'vitest';

import { getFilteredMutationCodes } from './getFilteredMutationCodes';
import { type DeletionEntry, type SubstitutionEntry } from '../../../types/dashboardComponents';
import { type Deletion, type Substitution } from '../../../util/mutations';

describe('getFilteredMutationCodes', () => {
    it('should remove mutations where overall proportion is below filter', () => {
        const result = getFilteredMutationCodes({
            overallMutationData: [
                { ...someSubstitutionEntry, proportion: belowFilter },
                { ...anotherSubstitutionEntry, proportion: inFilter },
                { ...someDeletionEntry, proportion: inFilter },
            ],
            proportionInterval,
        });

        expect(result).to.deep.equal([anotherSubstitution.code, someDeletion.code]);
    });

    it('should remove mutations where overall proportion is above filter', () => {
        const result = getFilteredMutationCodes({
            overallMutationData: [
                { ...someSubstitutionEntry, proportion: aboveFilter },
                { ...anotherSubstitutionEntry, proportion: inFilter },
                { ...someDeletionEntry, proportion: inFilter },
            ],
            proportionInterval,
        });

        expect(result).to.deep.equal([anotherSubstitution.code, someDeletion.code]);
    });

    it('should not remove mutations where overall proportion is at lower bound of filter', () => {
        const result = getFilteredMutationCodes({
            overallMutationData: [
                { ...someSubstitutionEntry, proportion: atFilterMin },
                { ...anotherSubstitutionEntry, proportion: inFilter },
                { ...someDeletionEntry, proportion: inFilter },
            ],
            proportionInterval,
        });

        expect(result).to.deep.equal([someSubstitution.code, anotherSubstitution.code, someDeletion.code]);
    });

    it('should not remove mutations where overall proportion is at upper bound of filter', () => {
        const result = getFilteredMutationCodes({
            overallMutationData: [
                { ...someSubstitutionEntry, proportion: atFilterMax },
                { ...anotherSubstitutionEntry, proportion: inFilter },
                { ...someDeletionEntry, proportion: inFilter },
            ],
            proportionInterval,
        });

        expect(result).to.deep.equal([someSubstitution.code, anotherSubstitution.code, someDeletion.code]);
    });

    it('should not filter by individual time-series proportions below the overall filter', () => {
        const result = getFilteredMutationCodes({
            overallMutationData: [someSubstitutionEntry, anotherSubstitutionEntry, someDeletionEntry],
            proportionInterval,
        });

        expect(result).to.deep.equal([someSubstitution.code, anotherSubstitution.code, someDeletion.code]);
    });

    it('should remove mutations at a bound of the filter that is exclusive', () => {
        const result = getFilteredMutationCodes({
            overallMutationData: [
                { ...someSubstitutionEntry, proportion: atFilterMin },
                { ...anotherSubstitutionEntry, proportion: inFilter },
                { ...someDeletionEntry, proportion: atFilterMax },
            ],
            proportionInterval: { ...proportionInterval, minExclusive: true, maxExclusive: true },
        });

        expect(result).to.deep.equal([anotherSubstitution.code]);
    });

    const belowFilter = 0.1;
    const atFilterMin = 0.2;
    const inFilter = 0.5;
    const atFilterMax = 0.9;
    const aboveFilter = 0.99;
    const proportionInterval = { min: atFilterMin, max: atFilterMax };

    const someSubstitution: Substitution = {
        type: 'substitution',
        valueAtReference: 'A',
        substitutionValue: 'T',
        code: 'A123T',
        segment: 'someSegment',
        position: 123,
    };
    const someSubstitutionEntry: SubstitutionEntry<Substitution> = {
        type: 'substitution',
        mutation: someSubstitution,
        count: 234,
        proportion: inFilter,
    };

    const anotherSubstitution: Substitution = {
        type: 'substitution',
        valueAtReference: 'G',
        substitutionValue: 'C',
        code: 'G345C',
        segment: 'someOtherSegment',
        position: 345,
    };
    const anotherSubstitutionEntry: SubstitutionEntry<Substitution> = {
        type: 'substitution',
        mutation: anotherSubstitution,
        count: 456,
        proportion: inFilter,
    };

    const someDeletion: Deletion = {
        type: 'deletion',
        valueAtReference: 'A',
        segment: 'someSegment',
        position: 567,
        code: 'A123-',
    };
    const someDeletionEntry: DeletionEntry<Deletion> = {
        type: 'deletion',
        mutation: someDeletion,
        count: 789,
        proportion: inFilter,
    };
});
