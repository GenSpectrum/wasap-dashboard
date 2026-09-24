import z from 'zod';

import { type DateRangeOption } from '../../components/inputs/dateRangeFilter/dateRangeOption';
import { sequenceTypeSchema, type TemporalGranularity } from '../../types/dashboardComponents';

export const SEQUENCE_TYPE = {
    nucleotide: 'nucleotide',
    aminoAcid: 'amino acid',
} as const satisfies Record<string, z.infer<typeof sequenceTypeSchema>>;

// --- the six per-mode filter-default shapes -------------------------------
//
// Each of these is also a `WasapAnalysisFilter` member — the shape of the
// *current* filter selection for that mode, not just its config default.

export const VARIANT_TIME_FRAME = {
    all: 'all',
    sixMonths: '6months',
    threeMonths: '3months',
} as const;
export const variantTimeFrameSchema = z.enum([
    VARIANT_TIME_FRAME.all,
    VARIANT_TIME_FRAME.sixMonths,
    VARIANT_TIME_FRAME.threeMonths,
]);
export type VariantTimeFrame = z.infer<typeof variantTimeFrameSchema>;

export function variantTimeFrameLabel(timeFrame: VariantTimeFrame): string {
    switch (timeFrame) {
        case VARIANT_TIME_FRAME.all:
            return 'All';
        case VARIANT_TIME_FRAME.sixMonths:
            return '6 months';
        case VARIANT_TIME_FRAME.threeMonths:
            return '3 months';
    }
}

export const SIGNATURE_TYPE = {
    computed: 'computed',
    predefined: 'predefined',
} as const;
/**
 * The type of variant mutation signature. `predefined` is a pre-defined list pulled from online,
 * `computed` computes the list of signature mutations for a variant based on user parameters.
 */
export const signatureTypeSchema = z.enum([SIGNATURE_TYPE.computed, SIGNATURE_TYPE.predefined]);
export type SignatureType = z.infer<typeof signatureTypeSchema>;

export const EXCLUDE_SET_NAME = {
    predefined: 'predefined',
    custom: 'custom',
} as const;
export const excludeSetNameSchema = z.enum([EXCLUDE_SET_NAME.predefined, EXCLUDE_SET_NAME.custom]);
export type ExcludeSetName = z.infer<typeof excludeSetNameSchema>;

export const wasapManualFilterSchema = z.object({
    mode: z.literal('manual'),
    sequenceType: sequenceTypeSchema,
    /**
     * A list of mutations like A23T (nucleotide) or S:E44H (amino acid).
     * The type of mutation should match the sequenceType.
     */
    mutations: z.array(z.string()).optional(),
});
export type WasapManualFilter = z.infer<typeof wasapManualFilterSchema>;

export const wasapVariantFilterSchema = z.object({
    mode: z.literal('variant'),
    signatureType: signatureTypeSchema,
    sequenceType: sequenceTypeSchema,
    // computed signature fields
    variant: z.string().optional(),
    minProportion: z.number(),
    minCount: z.number(),
    minJaccard: z.number(),
    timeFrame: variantTimeFrameSchema,
    // predefined signature fields
    collectionId: z.number().optional(),
    newMutationsOnly: z.boolean().optional(),
    includeSublineagesForJaccard: z.boolean().optional(),
});
export type WasapVariantFilter = z.infer<typeof wasapVariantFilterSchema>;

/**
 * Which mutations of a resistance set are shown, by their mean proportion: all of them,
 * or those that are (nearly) absent, present in part, or (nearly) fixed.
 */
export const RESISTANCE_PROPORTION_RANGE = {
    all: 'all',
    low: 'low',
    medium: 'medium',
    high: 'high',
} as const;
export const resistanceProportionRangeSchema = z.enum([
    RESISTANCE_PROPORTION_RANGE.all,
    RESISTANCE_PROPORTION_RANGE.low,
    RESISTANCE_PROPORTION_RANGE.medium,
    RESISTANCE_PROPORTION_RANGE.high,
]);
export type ResistanceProportionRange = z.infer<typeof resistanceProportionRangeSchema>;

export const wasapResistanceFilterSchema = z.object({
    mode: z.literal('resistance'),
    // resistance sets are only defined for amino acid mutations
    sequenceType: z.literal('amino acid'),
    resistanceSet: z.string(),
    proportionRange: resistanceProportionRangeSchema,
});
export type WasapResistanceFilter = z.infer<typeof wasapResistanceFilterSchema>;

export const wasapUntrackedFilterSchema = z.object({
    mode: z.literal('untracked'),
    sequenceType: sequenceTypeSchema,
    excludeSet: excludeSetNameSchema.optional(),
    excludeVariants: z.array(z.string()).optional(),
});
export type WasapUntrackedFilter = z.infer<typeof wasapUntrackedFilterSchema>;

/**
 * Where a collection comes from: GenSpectrum's own collections, which are always available once
 * the collection mode is enabled, or CoV-Spectrum's, which an organism can additionally enable
 * (not every organism has a CoV-Spectrum instance to pull collections from).
 */
export const COLLECTION_SOURCE = {
    genSpectrum: 'genSpectrum',
    covSpectrum: 'covSpectrum',
} as const;
export const collectionSourceSchema = z.enum([COLLECTION_SOURCE.genSpectrum, COLLECTION_SOURCE.covSpectrum]);
export type CollectionSource = z.infer<typeof collectionSourceSchema>;

export const wasapCollectionFilterSchema = z.object({
    mode: z.literal('collection'),
    source: collectionSourceSchema,
    collectionId: z.number().optional(),
});
export type WasapCollectionFilter = z.infer<typeof wasapCollectionFilterSchema>;

export type WasapAnalysisFilter =
    WasapManualFilter | WasapVariantFilter | WasapResistanceFilter | WasapUntrackedFilter | WasapCollectionFilter;

export const WASAP_ANALYSIS_MODE = {
    manual: 'manual',
    variant: 'variant',
    resistance: 'resistance',
    untracked: 'untracked',
    collection: 'collection',
} as const;
export const wasapAnalysisModeSchema = z.enum([
    WASAP_ANALYSIS_MODE.manual,
    WASAP_ANALYSIS_MODE.variant,
    WASAP_ANALYSIS_MODE.resistance,
    WASAP_ANALYSIS_MODE.untracked,
    WASAP_ANALYSIS_MODE.collection,
]);
export type WasapAnalysisMode = z.infer<typeof wasapAnalysisModeSchema>;

/**
 * Only mutations (or queries) whose mean proportion over the selected time range
 * lies within [lower, upper] are displayed. Both are proportions between 0 and 1.
 */
export type WasapMeanProportion = {
    lower: number;
    upper: number;
};

/**
 * Mode-independent settings, like the filter for location and date range —
 * the *current* filter selection (derived from URL state, see
 * `WasapModePageStateHandler`), not a `WasapPageConfig` default.
 */
export type WasapBaseFilter = {
    locationName?: string;
    samplingDate?: DateRangeOption;
    granularity: TemporalGranularity;
    excludeEmpty: boolean;
    meanProportion: WasapMeanProportion;
};

/**
 * The part of the base filter that selects the dataset, and that stays the same
 * when going from one analysis mode to another (the mean proportion doesn't).
 */
export type WasapDatasetFilter = Omit<WasapBaseFilter, 'meanProportion'>;

/**
 * The page state of one analysis mode page, where `analysis` is narrowed to the
 * filter of that mode.
 */
export type WasapModeFilter<Analysis extends WasapAnalysisFilter = WasapAnalysisFilter> = {
    base: WasapBaseFilter;
    analysis: Analysis;
};

export type WasapFilter = WasapModeFilter;
