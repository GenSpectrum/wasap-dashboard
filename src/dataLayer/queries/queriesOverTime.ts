/**
 * The SILO queries behind `gs-queries-over-time`.
 *
 * A "query" is a genome-only boolean expression (`SiloFilterExpression`, parsed
 * from an advanced-query string by LAPIS `/query/parse` in `src/`). Per query,
 * per date bucket, the grid shows `count / coverage`:
 *
 *   count    — reads that match the query
 *   coverage — reads that either match or *couldn't* match given their
 *              ambiguous calls: `q || !maybe(q)` (GenSpectrum/LAPIS#1558). The
 *              denominator for the proportion.
 *
 * So each query is two date-grouped counts; the totals per bucket come from the
 * shared date axis (`samplingDatesQuery`). No over-time primitive is involved —
 * unlike `mutations-over-time` there is no fan-out, just `queries.length × 2`
 * plain `groupBy(count(), {date})` calls, assembled into the matrix in
 * `components/data/queriesOverTime.ts`.
 *
 * `translateGenomeFilter` is the whole LAPIS→SILO bridge for this feature: the
 * 12 node types `validateGenomeOnly` lets through, each to a `rhydb` builder.
 */

import { READS } from './catalogue';
import { scoped, type SiloReadFilter } from './filter';
import type { SiloSchema } from './schema';
import type { SiloFilterExpression } from './siloFilterExpression';
import { and, bool, not, or, type Expr } from '../transport/expression';
import {
    aminoAcidEquals,
    aminoAcidInsertionContains,
    count,
    hasAAMutation,
    hasMutation,
    insertionContains,
    maybe,
    nOf,
    nucleotideEquals,
} from '../transport/functions';
import { type Relation } from '../transport/relation';

/**
 * A genome-only `SiloFilterExpression` as a SaneQL predicate.
 *
 * Only the node types `validateGenomeOnly` (`siloFilterExpression.ts`) admits
 * are handled — the six genome checks, `True`, and `And` / `Or` / `Not` /
 * `Maybe` / `N-Of` around them. Anything else throws: `queries-over-time`
 * rejects such a query upstream, so reaching the `default` branch is a bug.
 *
 * `sequenceName` is `null` / absent on the nucleotide nodes when the query
 * wrote an unprefixed code (`C241T`); it becomes the instance's nucleotide
 * sequence. The amino-acid nodes always carry their gene.
 */
export function translateGenomeFilter(schema: SiloSchema, node: SiloFilterExpression): Expr {
    switch (node.type) {
        case 'True':
            return bool(true);
        case 'And':
            return and(...node.children.map((child) => translateGenomeFilter(schema, child))) ?? bool(true);
        case 'Or':
            return or(...node.children.map((child) => translateGenomeFilter(schema, child))) ?? bool(true);
        case 'Not':
            return not(translateGenomeFilter(schema, node.child));
        case 'Maybe':
            return maybe(translateGenomeFilter(schema, node.child));
        case 'N-Of':
            return nOf(
                node.numberOfMatchers,
                node.children.map((child) => translateGenomeFilter(schema, child)),
                { matchExactly: node.matchExactly },
            );
        case 'NucleotideEquals':
            return nucleotideEquals({
                position: node.position,
                symbol: node.symbol,
                sequenceName: node.sequenceName ?? schema.nucleotideSequence,
            });
        case 'HasNucleotideMutation':
            return hasMutation({
                position: node.position,
                sequenceName: node.sequenceName ?? schema.nucleotideSequence,
            });
        case 'AminoAcidEquals':
            return aminoAcidEquals({
                position: node.position,
                symbol: node.symbol,
                sequenceName: node.sequenceName,
            });
        case 'HasAminoAcidMutation':
            return hasAAMutation({ position: node.position, sequenceName: node.sequenceName });
        case 'InsertionContains':
            return insertionContains({
                position: node.position,
                value: node.value,
                sequenceName: node.sequenceName ?? schema.nucleotideSequence,
            });
        case 'AminoAcidInsertionContains':
            return aminoAcidInsertionContains({
                position: node.position,
                value: node.value,
                sequenceName: node.sequenceName,
            });
        default:
            throw new Error(
                `queries-over-time cannot translate SILO filter node '${node.type}' to SaneQL ` +
                    '(validateGenomeOnly should have rejected the query)',
            );
    }
}

function groupByDate(relation: Relation, schema: SiloSchema): Relation {
    return relation.groupBy({ [READS]: count() }, [schema.groupingDate]);
}

/** Reads matching the query, per date bucket: `{ <date>, n }` rows. */
export function countOverTimeQuery(schema: SiloSchema, filter: SiloReadFilter, node: SiloFilterExpression): Relation {
    return groupByDate(scoped(schema, filter, translateGenomeFilter(schema, node)), schema);
}

/**
 * The coverage denominator per date bucket: reads that match the query *or*
 * cannot match it even allowing for ambiguity — `q || !maybe(q)`.
 */
export function coverageOverTimeQuery(
    schema: SiloSchema,
    filter: SiloReadFilter,
    node: SiloFilterExpression,
): Relation {
    const query = translateGenomeFilter(schema, node);
    return groupByDate(scoped(schema, filter, or(query, not(maybe(query)))), schema);
}
