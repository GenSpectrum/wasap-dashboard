import {
    RESISTANCE_PROPORTION_RANGE,
    type ResistanceProportionRange,
} from '../../../pageState/wasap/wasapAnalysisFilter';
import {
    type ProportionInterval,
    isInProportionInterval,
} from '../../dataDisplay/mutationsOverTime/getFilteredMutationCodes';

/**
 * The ranges of the mean proportion that the resistance page has a tab for, in the order
 * of the tabs. Apart from `all`, they don't overlap, so every mutation is in exactly one.
 */
export const RESISTANCE_PROPORTION_RANGES: {
    range: ResistanceProportionRange;
    label: string;
    interval: ProportionInterval;
}[] = [
    { range: RESISTANCE_PROPORTION_RANGE.all, label: 'All', interval: { min: 0, max: 1 } },
    { range: RESISTANCE_PROPORTION_RANGE.low, label: '0 – 0.01', interval: { min: 0, max: 0.01, maxExclusive: true } },
    { range: RESISTANCE_PROPORTION_RANGE.medium, label: '0.01 – 0.99', interval: { min: 0.01, max: 0.99 } },
    {
        range: RESISTANCE_PROPORTION_RANGE.high,
        label: '0.99 – 1',
        interval: { min: 0.99, max: 1, minExclusive: true },
    },
];

export function getProportionInterval(range: ResistanceProportionRange): ProportionInterval {
    const found = RESISTANCE_PROPORTION_RANGES.find((entry) => entry.range === range);
    if (found === undefined) {
        throw new Error(`Unknown proportion range '${range}'.`);
    }
    return found.interval;
}

/** How many of the given mean proportions are in each of the ranges. */
export function countByProportionRange(proportions: number[]): Record<ResistanceProportionRange, number> {
    return Object.fromEntries(
        RESISTANCE_PROPORTION_RANGES.map(({ range, interval }) => [
            range,
            proportions.filter((proportion) => isInProportionInterval(proportion, interval)).length,
        ]),
    ) as Record<ResistanceProportionRange, number>;
}
