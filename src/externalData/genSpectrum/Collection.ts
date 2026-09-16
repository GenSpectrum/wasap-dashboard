import { z } from 'zod';

const filterObjectSchema = z
    .object({
        aminoAcidMutations: z.array(z.string()).optional(),
        nucleotideMutations: z.array(z.string()).optional(),
        aminoAcidInsertions: z.array(z.string()).optional(),
        nucleotideInsertions: z.array(z.string()).optional(),
    })
    .catchall(z.string());

const queryVariantSchema = z.object({
    type: z.literal('query'),
    id: z.number(),
    collectionId: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    countQuery: z.string(),
    coverageQuery: z.string().nullable(),
});

const filterObjectVariantSchema = z.object({
    type: z.literal('filterObject'),
    id: z.number(),
    collectionId: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    filterObject: filterObjectSchema,
});

const variantSchema = z.discriminatedUnion('type', [queryVariantSchema, filterObjectVariantSchema]);

const collectionBaseSchema = z.object({
    id: z.number(),
    name: z.string(),
    ownedBy: z.number(),
    organism: z.string(),
    description: z.string().nullable(),
    variantCount: z.number().int().nonnegative(),
    tags: z.array(z.string()),
});

export const collectionSummarySchema = collectionBaseSchema;
export type CollectionSummary = z.infer<typeof collectionSummarySchema>;

export const collectionSchema = collectionBaseSchema.extend({
    variants: z.array(variantSchema),
});

export type Collection = z.infer<typeof collectionSchema>;
export type Variant = z.infer<typeof variantSchema>;
export type FilterObject = z.infer<typeof filterObjectSchema>;

export const FILTER_OBJECT_ARRAY_FIELD_LABELS = {
    aminoAcidMutations: 'Amino acid mutations',
    nucleotideMutations: 'Nucleotide mutations',
    aminoAcidInsertions: 'Amino acid insertions',
    nucleotideInsertions: 'Nucleotide insertions',
} as const;

/** Returns a filter object for the given variant that can be used as the body of a LAPIS API request. */
export function getVariantFilter(variant: Variant): Record<string, unknown> {
    if (variant.type === 'query') {
        return { advancedQuery: variant.countQuery };
    }
    return { ...variant.filterObject };
}

export function getLineageFields(filterObject: FilterObject): [string, string][] {
    const knownKeys = Object.keys(FILTER_OBJECT_ARRAY_FIELD_LABELS);
    return Object.entries(filterObject).filter(([key]) => !knownKeys.includes(key)) as [string, string][];
}
