import type { Temporal } from '../../../../domain/temporal';
import { Map2dBase, type Map2DContents } from '../../../../util/map2d';
import { type ProportionValue, serializeTemporal } from '../../../overTime/proportionValue';

/**
 * A specific combination of symbols observed across the queried positions, keyed
 * by the position's own label (`501`, or `S:501` for amino acid — see
 * `parsePositionToken`). `null` means the position is not covered (the read
 * carries `N`/`X` there, or nothing at all).
 */
export type CooccurrencePattern = {
    symbols: Record<string, string | null>;
};

export class CooccurrenceOverTimeDataMap extends Map2dBase<CooccurrencePattern, Temporal, ProportionValue> {
    constructor(initialContent?: Map2DContents<CooccurrencePattern, Temporal, ProportionValue>) {
        super(serializeCooccurrencePattern, serializeTemporal, initialContent);
    }
}

export function formatSymbol(symbol: string | null | undefined): string {
    return symbol ?? '?';
}

export function serializeCooccurrencePattern(pattern: CooccurrencePattern): string {
    return Object.entries(pattern.symbols)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([pos, symbol]) => `${pos}:${symbol ?? ''}`)
        .join('|');
}
