/**
 * The SaneQL functions this application calls.
 *
 * A named wrapper per function, so each one's argument names, their order and
 * how each argument is escaped are written down once.
 */

import { fn, int, str, type Expr } from './expression';

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
