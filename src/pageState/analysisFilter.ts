import z from 'zod';

import { type DateRangeOption } from '../domain/dateRange';
import { sequenceTypeSchema } from '../domain/mutations';
import { type TemporalGranularity } from '../domain/temporal';

export const SEQUENCE_TYPE = {
    nucleotide: 'nucleotide',
    aminoAcid: 'amino acid',
} as const satisfies Record<string, z.infer<typeof sequenceTypeSchema>>;

// --- the six per-mode filter-default shapes -------------------------------
//
// Each of these is also an `AnalysisFilter` member — the shape of the
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

export const MUTATION_SOURCE = {
    list: 'list',
    range: 'range',
} as const;
export const mutationSourceSchema = z.enum([MUTATION_SOURCE.list, MUTATION_SOURCE.range]);
export type MutationSource = z.infer<typeof mutationSourceSchema>;

/** At most this many positions in the position range of the manual mode. */
export const MAX_POSITION_RANGE_LENGTH = 300;

export const manualAnalysisSchema = z.object({
    mode: z.literal('manual'),
    sequenceType: sequenceTypeSchema,
    /** Where the mutations come from. Defaults to `list`, see `effectiveMutationSource`. */
    mutationSource: mutationSourceSchema.optional(),
    /**
     * A list of mutations like A23T (nucleotide) or S:E44H (amino acid).
     * The type of mutation should match the sequenceType. Used when `mutationSource` is `list`.
     */
    mutations: z.array(z.string()).optional(),
    /**
     * The gene of the position range, for amino acids. Used when `mutationSource` is `range`,
     * like `rangeStart` and `rangeLength`; see `effectivePositionRange` for their defaults.
     */
    rangeGene: z.string().optional(),
    /** The first position of the range, 1-based. */
    rangeStart: z.number().int().min(1).optional(),
    /** The number of positions in the range. */
    rangeLength: z.number().int().min(1).max(MAX_POSITION_RANGE_LENGTH).optional(),
});
export type ManualAnalysis = z.infer<typeof manualAnalysisSchema>;

export const variantAnalysisSchema = z.object({
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
    lineage: z.string().optional(),
    newMutationsOnly: z.boolean().optional(),
    includeSublineagesForJaccard: z.boolean().optional(),
    /**
     * Lineages of the lineage tree whose signature mutations are left out of the variant's, as the
     * background it stands on, for either type of signature.
     */
    backgroundLineages: z.array(z.string()).optional(),
    /** Whether the variant's mutations on (nearly) all reads are left out of it, too; unless `false`, they are. */
    excludeNearlyFixed: z.boolean().optional(),
    /** Whether the variant's deletions are left out of it, too; unless `false`, they are. */
    excludeDeletions: z.boolean().optional(),
});
export type VariantAnalysis = z.infer<typeof variantAnalysisSchema>;

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

export const resistanceAnalysisSchema = z.object({
    mode: z.literal('resistance'),
    // resistance sets are only defined for amino acid mutations
    sequenceType: z.literal('amino acid'),
    resistanceSet: z.string(),
    proportionRange: resistanceProportionRangeSchema,
});
export type ResistanceAnalysis = z.infer<typeof resistanceAnalysisSchema>;

export const untrackedAnalysisSchema = z.object({
    mode: z.literal('untracked'),
    sequenceType: sequenceTypeSchema,
    excludeSet: excludeSetNameSchema.optional(),
    excludeVariants: z.array(z.string()).optional(),
});
export type UntrackedAnalysis = z.infer<typeof untrackedAnalysisSchema>;

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

export const collectionAnalysisSchema = z.object({
    mode: z.literal('collection'),
    source: collectionSourceSchema,
    collectionId: z.number().optional(),
});
export type CollectionAnalysis = z.infer<typeof collectionAnalysisSchema>;

/**
 * The "Lineage Prevalence" page, which estimates the prevalences of a panel of lineages from the
 * mutation frequencies by kernel deconvolution (by the LolliPop service, see `lollipop-service/`).
 * The panel is fixed by the config (`deconvolutionPanel`); only a lineage can be added to it. The
 * lineages are named like in the lineage tree, where their signatures come from.
 */
export const deconvolutionAnalysisSchema = z.object({
    mode: z.literal('deconvolution'),
    /** A lineage added to the panel for the deconvolution, if any. */
    extraLineage: z.string().optional(),
});
export type DeconvolutionAnalysis = z.infer<typeof deconvolutionAnalysisSchema>;

/** The lineages to deconvolve: the panel, and `extraLineage` if it isn't in the panel already. */
export function effectivePanel(panel: string[], { extraLineage }: DeconvolutionAnalysis): string[] {
    return extraLineage === undefined || panel.includes(extraLineage) ? panel : [...panel, extraLineage];
}

export const POSITION_SOURCE = {
    manual: 'manual',
    amplicon: 'amplicon',
} as const;
export const positionSourceSchema = z.enum([POSITION_SOURCE.manual, POSITION_SOURCE.amplicon]);
export type PositionSource = z.infer<typeof positionSourceSchema>;

export const cooccurrenceAnalysisSchema = z.object({
    mode: z.literal('cooccurrence'),
    sequenceType: sequenceTypeSchema,
    /** Where the positions to run co-occurrence over come from. Defaults to `amplicon`, see `effectivePositionSource`. */
    positionSource: positionSourceSchema.optional(),
    /**
     * Bare sequence positions (no ref/alt symbol), like `501` (nucleotide) or `S:501`
     * (amino acid) — see `parsePositionToken`. Used when `positionSource` is `manual`.
     */
    positions: z.array(z.string()).optional(),
    /**
     * A single bare position (same syntax as `positions`) whose amplicon is scanned for
     * variable positions to run co-occurrence over. Used when `positionSource` is `amplicon`.
     */
    anchorPosition: z.string().optional(),
    /** Positions at or below this Shannon entropy (in bits) are left out as not variable enough. */
    entropyCutoff: z.number().min(0).optional(),
    /** Patterns on less than this share of the reads (0 to 1) are left out; none are without. */
    minShare: z.number().min(0).max(1).optional(),
    /**
     * EXPERIMENTAL: a panel of lineages (same concept as the config's
     * `deconvolutionPanel`) to check co-occurrence patterns against — which of them the panel already
     * explains, and which prevalent combinations it doesn't.
     */
    panel: z.array(z.string()).optional(),
});
export type CooccurrenceAnalysis = z.infer<typeof cooccurrenceAnalysisSchema>;

/** `entropyCutoff`'s value when the URL/config doesn't specify one. */
export const DEFAULT_ENTROPY_CUTOFF_BITS = 0.5;

/** `positionSource`'s value when the URL/config doesn't specify one — the single source of truth for that default. */
export function effectiveMutationSource(analysis: ManualAnalysis): MutationSource {
    return analysis.mutationSource ?? MUTATION_SOURCE.list;
}

export function effectivePositionSource(analysis: CooccurrenceAnalysis): PositionSource {
    return analysis.positionSource ?? POSITION_SOURCE.amplicon;
}

export type AnalysisFilter =
    | ManualAnalysis
    | VariantAnalysis
    | ResistanceAnalysis
    | UntrackedAnalysis
    | CollectionAnalysis
    | DeconvolutionAnalysis
    | CooccurrenceAnalysis;

export const ANALYSIS_MODE = {
    manual: 'manual',
    variant: 'variant',
    resistance: 'resistance',
    untracked: 'untracked',
    collection: 'collection',
    deconvolution: 'deconvolution',
    cooccurrence: 'cooccurrence',
} as const;
export const analysisModeSchema = z.enum([
    ANALYSIS_MODE.manual,
    ANALYSIS_MODE.variant,
    ANALYSIS_MODE.resistance,
    ANALYSIS_MODE.untracked,
    ANALYSIS_MODE.collection,
    ANALYSIS_MODE.deconvolution,
    ANALYSIS_MODE.cooccurrence,
]);
export type AnalysisMode = z.infer<typeof analysisModeSchema>;

/**
 * Only mutations (or queries) whose mean proportion over the selected time range
 * lies within [lower, upper] are displayed. Both are proportions between 0 and 1.
 */
export type MeanProportion = {
    lower: number;
    upper: number;
};

/**
 * Mode-independent settings, like the filter for location and date range —
 * the *current* filter selection (derived from URL state, see
 * `ModePageStateHandler`), not a `OrganismConfig` default.
 */
export type BaseFilter = {
    /** The locations whose reads are pooled. Empty means all locations. */
    locationNames: string[];
    samplingDate?: DateRangeOption;
    granularity: TemporalGranularity;
    meanProportion: MeanProportion;
};

/**
 * The part of the base filter that selects the dataset, and that stays the same
 * when going from one analysis mode to another (the mean proportion doesn't).
 */
export type DatasetFilter = Omit<BaseFilter, 'meanProportion'>;

/**
 * The page state of one analysis mode page, where `analysis` is narrowed to the
 * filter of that mode.
 */
export type ModeFilter<Analysis extends AnalysisFilter = AnalysisFilter> = {
    base: BaseFilter;
    analysis: Analysis;
};
