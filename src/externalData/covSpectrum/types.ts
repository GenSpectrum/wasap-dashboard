import { z } from 'zod';

/**
 * CoV-Spectrum "collections" (variant collections, e.g. `Collection`/`CollectionRaw` below)
 * are a distinct concept from the GenSpectrum "collections" backend's collections
 * (`src/externalData/genSpectrum/Collection.ts`) — different API, different owner,
 * different shape (a CoV-Spectrum variant's `query` is a raw string parsed client-side into
 * `variantQuery`/`detailedMutations`, vs. the GenSpectrum backend's `countQuery`/`coverageQuery`/
 * `filterObject`). They just happen to share the word "collection". This module deliberately
 * doesn't reuse `genSpectrum`'s `ApiService` — it's a different backend, not the same one done twice.
 */
export const collectionVariantRawSchema = z.object({
    query: z.string(),
    name: z.string(),
    description: z.string(),
    highlighted: z.boolean(),
});

export const collectionRawSchema = z.object({
    id: z.number(),
    title: z.string(),
    description: z.string(),
    maintainers: z.string(),
    email: z.string(),
    variants: z.array(collectionVariantRawSchema),
});

export const collectionsRawResponseSchema = z.array(collectionRawSchema);

export type CollectionVariantRaw = z.infer<typeof collectionVariantRawSchema>;
export type CollectionRaw = z.infer<typeof collectionRawSchema>;

export const variantQuerySchema = z.object({
    type: z.literal('variantQuery'),
    variantQuery: z.string(),
});

export const detailedMutationsQuerySchema = z.object({
    type: z.literal('detailedMutations'),
    pangoLineage: z.string().optional(),
    nextcladePangoLineage: z.string().optional(),
    nucMutations: z.array(z.string()).optional(),
    aaMutations: z.array(z.string()).optional(),
    nucInsertions: z.array(z.string()).optional(),
    aaInsertions: z.array(z.string()).optional(),
});

export type DetailedMutationsQuery = z.infer<typeof detailedMutationsQuerySchema>;

export const collectionVariantSchema = z.object({
    query: z.discriminatedUnion('type', [variantQuerySchema, detailedMutationsQuerySchema]),
    name: z.string(),
    description: z.string(),
    highlighted: z.boolean(),
});

export const collectionSchema = z.object({
    id: z.number(),
    title: z.string(),
    description: z.string(),
    maintainers: z.string(),
    email: z.string(),
    variants: z.array(collectionVariantSchema),
});

export type CollectionVariant = z.infer<typeof collectionVariantSchema>;
export type Collection = z.infer<typeof collectionSchema>;
