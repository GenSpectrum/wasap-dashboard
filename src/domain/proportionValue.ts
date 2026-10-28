/**
 * One cell of an over-time grid: a feature (mutation or query) in one date bucket.
 *
 * - `value`: some reads in the bucket cover the feature; `count` of the `coverage` reads carry it.
 * - `noCoverage`: the bucket has reads (`totalCount`), but none of them cover the feature.
 * - `null`: the bucket has no reads at all.
 */
export type ProportionValue =
    | {
          type: 'value';
          count: number;
          coverage: number;
          totalCount: number;
      }
    | {
          type: 'noCoverage';
          totalCount: number | null;
      }
    | null;

export function getProportion(value: ProportionValue) {
    switch (value?.type) {
        case 'value':
            return value.count / value.coverage;
        case 'noCoverage':
            return undefined;
    }
    return undefined;
}
