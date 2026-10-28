import { SubstitutionClass, type SequenceType } from '../../../domain/mutations';

/**
 * A bare sequence position for co-occurrence, without a mutation's ref/alt symbols:
 * `501` (nucleotide, the organism's one sequence) or `S:501` (amino acid,
 * gene-qualified). `label` is the canonical rendering, not necessarily the raw
 * input (case/whitespace normalized).
 */
export type PositionToken = {
    label: string;
    segment: string | undefined;
    position: number;
};

/**
 * Parses one position token for the given sequence type, or `null` if it isn't
 * one — including a full mutation code like `S:501Y`, which carries symbols this
 * control doesn't take. Built on `SubstitutionClass.parse`'s regex so the same
 * position syntax mutation codes use is accepted here, just without a symbol at
 * either end.
 */
export function parsePositionToken(raw: string, sequenceType: SequenceType): PositionToken | null {
    const trimmed = raw.trim();
    if (trimmed === '') {
        return null;
    }

    const parsed = SubstitutionClass.parse(trimmed, sequenceType === 'nucleotide');
    if (parsed === null || parsed.valueAtReference !== undefined || parsed.substitutionValue !== undefined) {
        return null;
    }
    if (sequenceType === 'amino acid' && parsed.segment === undefined) {
        return null;
    }
    if (sequenceType === 'nucleotide' && parsed.segment !== undefined) {
        return null;
    }

    const label = parsed.segment !== undefined ? `${parsed.segment}:${parsed.position}` : `${parsed.position}`;
    return { label, segment: parsed.segment, position: parsed.position };
}
