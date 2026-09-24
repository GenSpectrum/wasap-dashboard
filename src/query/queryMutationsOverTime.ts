import { type Map2dView } from '../util/map2d';
import { type Deletion, type Substitution } from '../util/mutations';
import { type Temporal } from '../util/temporalClass';

export type ProportionValue =
    | {
          type: 'valueWithCoverage';
          count: number;
          coverage: number;
          totalCount: number;
      }
    | {
          type: 'belowThreshold';
          totalCount: number | null;
      }
    | null;

export function getProportion(value: ProportionValue) {
    switch (value?.type) {
        case 'valueWithCoverage':
            return value.count / value.coverage;
        case 'belowThreshold':
            return undefined;
    }
    return undefined;
}

export const MUTATIONS_OVER_TIME_MIN_PROPORTION = 0.001;

/**
 * Deletes columns (second axis keys, typically dates) from `view` that have no value with
 * `totalCount > 0`, i.e. time periods with no data at all.
 */
export function hideGapsInPlace<Key1 extends object | string>(view: Map2dView<Key1, Temporal, ProportionValue>) {
    view.getSecondAxisKeys()
        .filter((date) => {
            const vals = view.getColumn(date);
            return !vals.some((v) => v?.type === 'valueWithCoverage' && v.totalCount > 0);
        })
        .forEach((date) => view.deleteColumn(date));
}

export function serializeSubstitutionOrDeletion(mutation: Substitution | Deletion) {
    return mutation.code;
}

export function serializeTemporal(date: Temporal) {
    return date.dateString;
}
