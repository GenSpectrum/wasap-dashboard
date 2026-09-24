import z from 'zod';

import { type SubstitutionOrDeletionEntry } from '../../../types/dashboardComponents';
import type { Deletion, Substitution } from '../../../util/mutations';

export const displayMutationsSchema = z.array(z.string(), {
    errorMap: () => ({ message: `invalid display mutations` }),
});

/**
 * An interval of mean proportions. Both bounds are included, unless marked as exclusive,
 * so that adjacent intervals (like 0 – 0.01 and 0.01 – 0.99) don't both contain the value
 * they share.
 */
export type ProportionInterval = {
    min: number;
    max: number;
    minExclusive?: boolean;
    maxExclusive?: boolean;
};

export function isInProportionInterval(proportion: number, interval: ProportionInterval): boolean {
    const aboveMin = interval.minExclusive === true ? proportion > interval.min : proportion >= interval.min;
    const belowMax = interval.maxExclusive === true ? proportion < interval.max : proportion <= interval.max;
    return aboveMin && belowMax;
}

export type GetFilteredMutationOverTimeDataArgs = {
    overallMutationData: SubstitutionOrDeletionEntry<Substitution, Deletion>[];
    proportionInterval: ProportionInterval;
};

/**
 * Extracts a list of mutation codes that should be displayed based on the mean proportion interval and overall mutation data.
 */
export function getFilteredMutationCodes({
    overallMutationData,
    proportionInterval,
}: GetFilteredMutationOverTimeDataArgs): string[] {
    return overallMutationData
        .filter((entry) => isInProportionInterval(entry.proportion, proportionInterval))
        .map((e) => e.mutation.code);
}
