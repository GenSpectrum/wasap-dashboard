import { type Deletion, type Substitution } from '../../domain/mutations';
import { type ProportionValue } from '../../domain/proportionValue';
import { type Temporal } from '../../domain/temporal';
import { type Map2dView } from '../../util/map2d';

/**
 * Deletes columns (second axis keys, typically dates) from `view` that have no value with
 * `totalCount > 0`, i.e. time periods with no data at all.
 */
export function removeEmptyDatesInPlace<Key1 extends object | string>(
    view: Map2dView<Key1, Temporal, ProportionValue>,
) {
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
