import z from 'zod';

import { type SubstitutionOrDeletionEntry } from '../../types/dashboardComponents';
import type { Deletion, Substitution } from '../../util/mutations';
import type { DisplayedMutationType } from '../shared/mutation-type-selector';

export const displayMutationsSchema = z.array(z.string(), {
    errorMap: () => ({ message: `invalid display mutations` }),
});

export type GetFilteredMutationOverTimeDataArgs = {
    overallMutationData: SubstitutionOrDeletionEntry<Substitution, Deletion>[];
    displayedMutationTypes: DisplayedMutationType[];
    proportionInterval: { min: number; max: number };
};

/**
 * Extracts a list of mutation codes that should be displayed based on the provided filters and overall mutation data.
 */
export function getFilteredMutationCodes({
    overallMutationData,
    displayedMutationTypes,
    proportionInterval,
}: GetFilteredMutationOverTimeDataArgs): string[] {
    return overallMutationData
        .filter((entry) => {
            if (entry.proportion < proportionInterval.min || entry.proportion > proportionInterval.max) {
                return false;
            }

            return !displayedMutationTypes.some(
                (mutationType) => mutationType.type === entry.mutation.type && !mutationType.checked,
            );
        })
        .map((e) => e.mutation.code);
}
