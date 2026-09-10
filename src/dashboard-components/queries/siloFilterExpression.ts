/**
 * The SILO filter-expression AST — the tree LAPIS's `/query/parse` returns for
 * an advanced-query string, and the input to the `queries-over-time` SILO
 * translation (`queriesOverTime.ts`).
 *
 * `src/` posts the query strings to `/query/parse` (the one LAPIS call the
 * SILO build keeps) and hands the parsed expressions down as the
 * `gs-queries-over-time` `queries` prop; `validateGenomeOnly` gates them first,
 * so the translator only ever sees the node types it lists.
 */

import { z } from 'zod';

const stringEqualsSchema = z.object({
    type: z.literal('StringEquals'),
    column: z.string(),
    value: z.string().nullable(),
});

const booleanEqualsSchema = z.object({
    type: z.literal('BooleanEquals'),
    column: z.string(),
    value: z.boolean().nullable(),
});

const lineageEqualsSchema = z.object({
    type: z.literal('Lineage'),
    column: z.string(),
    value: z.string().nullable(),
    includeSublineages: z.boolean(),
});

const nucleotideSymbolEqualsSchema = z.object({
    type: z.literal('NucleotideEquals'),
    sequenceName: z.string().nullable().optional(),
    position: z.number(),
    symbol: z.string(),
});

const hasNucleotideMutationSchema = z.object({
    type: z.literal('HasNucleotideMutation'),
    sequenceName: z.string().nullable().optional(),
    position: z.number(),
});

const aminoAcidSymbolEqualsSchema = z.object({
    type: z.literal('AminoAcidEquals'),
    sequenceName: z.string(),
    position: z.number(),
    symbol: z.string(),
});

const hasAminoAcidMutationSchema = z.object({
    type: z.literal('HasAminoAcidMutation'),
    sequenceName: z.string(),
    position: z.number(),
});

const dateBetweenSchema = z.object({
    type: z.literal('DateBetween'),
    column: z.string(),
    from: z.string().nullable(), // ISO date string
    to: z.string().nullable(), // ISO date string
});

const nucleotideInsertionContainsSchema = z.object({
    type: z.literal('InsertionContains'),
    position: z.number(),
    value: z.string(),
    sequenceName: z.string().nullable().optional(),
});

const aminoAcidInsertionContainsSchema = z.object({
    type: z.literal('AminoAcidInsertionContains'),
    position: z.number(),
    value: z.string(),
    sequenceName: z.string(),
});

const trueSchema = z.object({
    type: z.literal('True'),
});

const intEqualsSchema = z.object({
    type: z.literal('IntEquals'),
    column: z.string(),
    value: z.number().nullable(),
});

const intBetweenSchema = z.object({
    type: z.literal('IntBetween'),
    column: z.string(),
    from: z.number().nullable(),
    to: z.number().nullable(),
});

const floatEqualsSchema = z.object({
    type: z.literal('FloatEquals'),
    column: z.string(),
    value: z.number().nullable(),
});

const floatBetweenSchema = z.object({
    type: z.literal('FloatBetween'),
    column: z.string(),
    from: z.number().nullable(),
    to: z.number().nullable(),
});

const stringSearchSchema = z.object({
    type: z.literal('StringSearch'),
    column: z.string(),
    searchExpression: z.string().nullable(),
});

const phyloDescendantOfSchema = z.object({
    type: z.literal('PhyloDescendantOf'),
    column: z.string(),
    internalNode: z.string(),
});

// Recursive types for And, Or, Not, Maybe, NOf
// We need to define the base type first, then extend it
export type SiloFilterExpression = z.infer<typeof siloFilterExpressionSchema>;

const andSchema: z.ZodType<{
    type: 'And';
    children: SiloFilterExpression[];
}> = z.lazy(() =>
    z.object({
        type: z.literal('And'),
        children: z.array(siloFilterExpressionSchema),
    }),
);

const orSchema: z.ZodType<{
    type: 'Or';
    children: SiloFilterExpression[];
}> = z.lazy(() =>
    z.object({
        type: z.literal('Or'),
        children: z.array(siloFilterExpressionSchema),
    }),
);

const notSchema: z.ZodType<{
    type: 'Not';
    child: SiloFilterExpression;
}> = z.lazy(() =>
    z.object({
        type: z.literal('Not'),
        child: siloFilterExpressionSchema,
    }),
);

const maybeSchema: z.ZodType<{
    type: 'Maybe';
    child: SiloFilterExpression;
}> = z.lazy(() =>
    z.object({
        type: z.literal('Maybe'),
        child: siloFilterExpressionSchema,
    }),
);

const nOfSchema: z.ZodType<{
    type: 'N-Of';
    numberOfMatchers: number;
    matchExactly: boolean;
    children: SiloFilterExpression[];
}> = z.lazy(() =>
    z.object({
        type: z.literal('N-Of'),
        numberOfMatchers: z.number(),
        matchExactly: z.boolean(),
        children: z.array(siloFilterExpressionSchema),
    }),
);

/**
 * Given an expression, returns a list of all the metadata fields that are referenced
 * in the expression.
 */
export function extractMetadataFields(expr: SiloFilterExpression): string[] {
    switch (expr.type) {
        case 'StringEquals':
        case 'BooleanEquals':
        case 'Lineage':
        case 'DateBetween':
        case 'IntEquals':
        case 'IntBetween':
        case 'FloatEquals':
        case 'FloatBetween':
        case 'StringSearch':
        case 'PhyloDescendantOf':
            return [expr.column];
        case 'And':
        case 'Or':
        case 'N-Of':
            return expr.children.flatMap(extractMetadataFields);
        case 'Not':
        case 'Maybe':
            return extractMetadataFields(expr.child);
        default:
            return [];
    }
}

// Combined union for all SiloFilterExpression types.
// This schema was initially LLM generated from the LAPIS code.
export const siloFilterExpressionSchema = z.union([
    stringEqualsSchema,
    booleanEqualsSchema,
    lineageEqualsSchema,
    nucleotideSymbolEqualsSchema,
    hasNucleotideMutationSchema,
    aminoAcidSymbolEqualsSchema,
    hasAminoAcidMutationSchema,
    dateBetweenSchema,
    nucleotideInsertionContainsSchema,
    aminoAcidInsertionContainsSchema,
    trueSchema,
    intEqualsSchema,
    intBetweenSchema,
    floatEqualsSchema,
    floatBetweenSchema,
    stringSearchSchema,
    phyloDescendantOfSchema,
    andSchema,
    orSchema,
    notSchema,
    maybeSchema,
    nOfSchema,
]);

export type GenomeCheckResult = { isGenomeOnly: true } | { isGenomeOnly: false; error: string };

/** The node types `queriesOverTime.ts` can translate to SaneQL — the leaves. */
const GENOME_CHECK_TYPES = new Set([
    'NucleotideEquals',
    'HasNucleotideMutation',
    'AminoAcidEquals',
    'HasAminoAcidMutation',
    'InsertionContains',
    'AminoAcidInsertionContains',
]);

/**
 * Whether an expression is made only of genome checks and the boolean
 * combinators — no metadata predicates (`StringEquals`, `DateBetween`,
 * `Lineage`, …). `queries-over-time` rejects a query that isn't, so the SaneQL
 * translator (`queriesOverTime.ts`) only ever sees `True`, the six genome
 * checks, and `And` / `Or` / `Not` / `Maybe` / `N-Of` around them.
 */
export function validateGenomeOnly(expression: SiloFilterExpression): GenomeCheckResult {
    const nonGenomeTypes: string[] = [];

    function traverse(expr: SiloFilterExpression): void {
        const { type } = expr;

        if (type === 'And' || type === 'Or' || type === 'N-Of') {
            expr.children.forEach(traverse);
            return;
        }
        if (type === 'Not' || type === 'Maybe') {
            traverse(expr.child);
            return;
        }
        if (type === 'True' || GENOME_CHECK_TYPES.has(type)) {
            return;
        }

        nonGenomeTypes.push(type);
    }

    traverse(expression);

    if (nonGenomeTypes.length > 0) {
        return {
            isGenomeOnly: false,
            error: `Expression contains non-genome check types: ${nonGenomeTypes.join(', ')}`,
        };
    }

    return { isGenomeOnly: true };
}
