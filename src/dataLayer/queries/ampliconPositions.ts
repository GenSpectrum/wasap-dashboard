/**
 * Every covered position's full allele distribution, restricted to reads that cover one anchor
 * position — one `mutations(minProportion := 0)` scan. Coverage is flat across an amplicon with a
 * sharp cliff at its edges, so this also reveals the amplicon's own boundaries for free.
 *
 * `!=` isn't valid SaneQL here ("Expected RightParen but got Not"); negate the exact match instead
 * (`!nucleotideEquals(...)` / `!aminoAcidEquals(...)`).
 */

import { scoped, type RhydbReadFilter } from './filter';
import { type OverTimeSequenceType, type PositionTarget } from './mutationsOverTime';
import type { RhydbSchema } from './schema';
import { unknownSymbol } from '../../domain/symbols';
import { not } from '../transport/expression';
import { aminoAcidEquals, nucleotideEquals } from '../transport/functions';
import { type Relation } from '../transport/relation';
import { readCount, readOptionalText, readText, type RhydbRow } from '../transport/row';

const AMPLICON_POSITIONS_FIELDS = ['mutationFrom', 'mutationTo', 'position', 'count', 'coverage'] as const;

/** The symbol that means "the read did not call anything at this position". */
export function ampliconPositionsQuery(
    schema: RhydbSchema,
    filter: RhydbReadFilter,
    anchor: PositionTarget,
    sequenceType: OverTimeSequenceType,
): Relation {
    const unknown = unknownSymbol(sequenceType);
    const options = { position: anchor.position, symbol: unknown, sequenceName: anchor.sequenceName };
    const coversAnchor = not(sequenceType === 'nucleotide' ? nucleotideEquals(options) : aminoAcidEquals(options));

    const relation = scoped(schema, filter, coversAnchor);
    const args = { minProportion: 0, sequenceNames: [anchor.sequenceName], fields: AMPLICON_POSITIONS_FIELDS };
    return sequenceType === 'nucleotide' ? relation.mutations(args) : relation.aminoAcidMutations(args);
}

export type AmpliconPositionRow = {
    position: number;
    /** The reference symbol at this position. */
    mutationFrom: string;
    /** The observed (non-reference) symbol this row's count is for. */
    mutationTo: string;
    count: number;
    coverage: number;
};

export function readAmpliconPositionRows(rows: readonly RhydbRow[]): AmpliconPositionRow[] {
    return rows.map((row) => ({
        position: readCount(row, 'position'),
        mutationFrom: readText(row, 'mutationFrom'),
        mutationTo: readOptionalText(row, 'mutationTo') ?? '',
        count: readCount(row, 'count'),
        coverage: readCount(row, 'coverage'),
    }));
}
