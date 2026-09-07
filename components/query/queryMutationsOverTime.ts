import { type Map2dView } from '../utils/map2d';
import { type Deletion, type Substitution } from '../utils/mutations';
import { type Temporal } from '../utils/temporalClass';

export type ProportionValue =
    | {
          type: 'value';
          proportion: number;
          count: number;
          totalCount: number;
      }
    | {
          type: 'valueWithCoverage';
          count: number;
          coverage: number;
          totalCount: number;
      }
    | {
          type: 'wastewaterValue';
          proportion: number;
      }
    | {
          type: 'belowThreshold';
          totalCount: number | null;
      }
    | null;

export function getProportion(value: ProportionValue) {
    switch (value?.type) {
        case 'value':
        case 'wastewaterValue':
            return value.proportion;
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
            return !vals.some((v) => (v?.type === 'value' || v?.type === 'valueWithCoverage') && v.totalCount > 0);
        })
        .forEach((date) => view.deleteColumn(date));
}

export function serializeSubstitutionOrDeletion(mutation: Substitution | Deletion) {
    return mutation.code;
}

export function serializeTemporal(date: Temporal) {
    return date.dateString;
}
