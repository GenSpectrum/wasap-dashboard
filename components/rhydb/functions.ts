/**
 * The SaneQL functions this application calls.
 *
 * A named wrapper per function, so each one's argument names, their order and
 * how each argument is escaped are written down once.
 */

import { bool, Expr, fn, int, PRECEDENCE, set, str } from './expression';

/** Rows in the group. */
export function count(): Expr {
    return fn('count');
}

/**
 * Whether a read carries `symbol` at a nucleotide position.
 *
 * The sequence travels as a string literal, not an identifier.
 */
export function nucleotideEquals(options: { position: number; symbol: string; sequenceName: string }): Expr {
    return symbolEquals('nucleotideEquals', options);
}

/** The same for a codon of a gene. */
export function aminoAcidEquals(options: { position: number; symbol: string; sequenceName: string }): Expr {
    return symbolEquals('aminoAcidEquals', options);
}

/** Whether a read has any value for this sequence at all. */
export function isNotNull(sequence: Expr): Expr {
    return fn('isNotNull', [sequence]);
}

/**
 * Whether a read carries *any* non-reference, non-ambiguous symbol at a
 * nucleotide position — the "has a mutation here, don't care which" predicate.
 * `sequenceName` is mandatory (SILO rejects the call without it).
 */
export function hasMutation(options: { position: number; sequenceName: string }): Expr {
    return hasMutationAt('hasMutation', options);
}

/** The same for a codon of a gene. */
export function hasAAMutation(options: { position: number; sequenceName: string }): Expr {
    return hasMutationAt('hasAAMutation', options);
}

/**
 * Relax a sequence predicate to also admit reads that *could* match given their
 * ambiguous calls: `maybe(nucleotideEquals(…))`. The coverage side of a
 * queries-over-time query is `q || !maybe(q)`.
 */
export function maybe(child: Expr): Expr {
    return fn('maybe', [child]);
}

/**
 * Whether a read's insertion at a position contains `value` (a regex).
 * `aminoAcidInsertionContains` is the gene form.
 */
export function insertionContains(options: { position: number; value: string; sequenceName: string }): Expr {
    return insertionContainsAt('insertionContains', options);
}

export function aminoAcidInsertionContains(options: { position: number; value: string; sequenceName: string }): Expr {
    return insertionContainsAt('aminoAcidInsertionContains', options);
}

/**
 * `nOf(count, {a, b, c}[, matchExactly := bool])` — a read matches when at least
 * (or, with `matchExactly`, exactly) `count` of the matchers hold. Rendered by
 * hand: the call mixes a positional count, a set literal, and a named flag,
 * which `fn()`'s all-positional / all-named forms don't cover.
 */
export function nOf(count: number, matchers: readonly Expr[], options?: { matchExactly?: boolean }): Expr {
    if (!Number.isInteger(count) || count < 0) {
        throw new Error(`Not a valid n-of count: ${count}`);
    }
    const args = [String(count), set(matchers).render()];
    if (options?.matchExactly !== undefined) {
        args.push(`matchExactly := ${bool(options.matchExactly).render()}`);
    }
    return new Expr(PRECEDENCE.atomic, `nOf(${args.join(', ')})`);
}

function symbolEquals(
    name: 'nucleotideEquals' | 'aminoAcidEquals',
    options: { position: number; symbol: string; sequenceName: string },
): Expr {
    if (!Number.isInteger(options.position) || options.position < 1) {
        throw new Error(`Not a reference position: ${options.position}`);
    }
    return fn(name, {
        position: int(options.position),
        symbol: str(options.symbol),
        sequenceName: str(options.sequenceName),
    });
}

function hasMutationAt(
    name: 'hasMutation' | 'hasAAMutation',
    options: { position: number; sequenceName: string },
): Expr {
    if (!Number.isInteger(options.position) || options.position < 1) {
        throw new Error(`Not a reference position: ${options.position}`);
    }
    return fn(name, { position: int(options.position), sequenceName: str(options.sequenceName) });
}

function insertionContainsAt(
    name: 'insertionContains' | 'aminoAcidInsertionContains',
    options: { position: number; value: string; sequenceName: string },
): Expr {
    if (!Number.isInteger(options.position) || options.position < 1) {
        throw new Error(`Not a reference position: ${options.position}`);
    }
    return fn(name, {
        position: int(options.position),
        value: str(options.value),
        sequenceName: str(options.sequenceName),
    });
}
