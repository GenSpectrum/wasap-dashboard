import z from 'zod';

import { type SubstitutionOrDeletionEntry } from '../../../types/dashboardComponents';
import type { Deletion, Substitution } from '../../../util/mutations';

export const displayMutationsSchema = z.array(z.string(), {
    errorMap: () => ({ message: `invalid display mutations` }),
});

export type GetFilteredMutationOverTimeDataArgs = {
    overallMutationData: SubstitutionOrDeletionEntry<Substitution, Deletion>[];
    proportionInterval: { min: number; max: number };
};

/**
 * Extracts a list of mutation codes that should be displayed based on the mean proportion interval and overall mutation data.
 */
export function getFilteredMutationCodes({
    overallMutationData,
    proportionInterval,
}: GetFilteredMutationOverTimeDataArgs): string[] {
    return overallMutationData
        .filter((entry) => entry.proportion >= proportionInterval.min && entry.proportion <= proportionInterval.max)
        .map((e) => e.mutation.code);
}
