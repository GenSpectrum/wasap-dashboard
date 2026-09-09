import { type Temporal } from '../utils/temporalClass';

/** A query's grid-row key is just its display label. */
export function serializeQuery(displayLabel: string): string {
    return displayLabel;
}

export function serializeTemporal(date: Temporal): string {
    return date.dateString;
}
