import { type Map2dView } from '../../../util/map2d';
import { type Deletion, type Substitution } from '../../../util/mutations';
import { type Temporal } from '../../../util/temporalClass';

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

/**
 * Deletes columns (second axis keys, typically dates) from `view` that have no value with
 * `totalCount > 0`, i.e. time periods with no data at all.
 */
export function hideGapsInPlace<Key1 extends object | string>(view: Map2dView<Key1, Temporal, ProportionValue>) {
    view.getSecondAxisKeys()
        .filter((date) => {
            const vals = view.getColumn(date);
            return !vals.some((v) => v?.type === 'value' && v.totalCount > 0);
        })
        .forEach((date) => view.deleteColumn(date));
}

export function serializeSubstitutionOrDeletion(mutation: Substitution | Deletion) {
    return mutation.code;
}

export function serializeTemporal(date: Temporal) {
    return date.dateString;
}
