import z from 'zod';

import { organismSchema } from '../../../types/Organism';
import { sequenceTypeSchema, type TemporalGranularity } from '../../../types/dashboardComponents';
import { type DateRangeOption } from '../../dateRangeFilter/dateRangeOption';


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

export const wasapResistanceFilterSchema = z.object({
    mode: z.literal('resistance'),
    // resistance sets are only defined for amino acid mutations
    sequenceType: z.literal('amino acid'),
    resistanceSet: z.string(),
});
export type WasapResistanceFilter = z.infer<typeof wasapResistanceFilterSchema>;

export const wasapUntrackedFilterSchema = z.object({
    mode: z.literal('untracked'),
    sequenceType: sequenceTypeSchema,
    excludeSet: excludeSetNameSchema.optional(),
    excludeVariants: z.array(z.string()).optional(),
});
export type WasapUntrackedFilter = z.infer<typeof wasapUntrackedFilterSchema>;

export const wasapCovSpectrumCollectionFilterSchema = z.object({
    mode: z.literal('covSpectrumCollection'),
    collectionId: z.number().optional(),
});
export type WasapCovSpectrumCollectionFilter = z.infer<typeof wasapCovSpectrumCollectionFilterSchema>;

export const wasapCollectionFilterSchema = z.object({
    mode: z.literal('collection'),
    collectionId: z.number().optional(),
});
export type WasapCollectionFilter = z.infer<typeof wasapCollectionFilterSchema>;

export type WasapAnalysisFilter =
    | WasapManualFilter
    | WasapVariantFilter
    | WasapResistanceFilter
    | WasapUntrackedFilter
    | WasapCovSpectrumCollectionFilter
    | WasapCollectionFilter;

// --- the page config itself ------------------------------------------------

/**
 * Resistance mutations defined in a collection, which is specified via the collection ID.
 */
export const resistanceMutationCollectionConfigSchema = z.object({
    collectionId: z.number(),
    name: z.string(),
    description: z.string(),
    annotationSymbol: z.string(),
});
export type ResistanceMutationCollectionConfig = z.infer<typeof resistanceMutationCollectionConfigSchema>;

export const siloInstanceConfigSchema = z.object({
    /** Base URL of the SILO instance, e.g. `https://silo.wasap.genspectrum.org/covid`. */
    url: z.string(),
    /** Root table name. `default` for every current instance. */
    table: z.string(),
    /**
     * Column to group and range on for date-bucketed reads. covid's instance
     * carries a dictionary-encoded `date` column (cheap to group); rsv-a / rsv-b
     * have only `samplingDate` (DATE32), which SILO groups pathologically slowly —
     * so date-bucketed RSV views stay blocked until those instances gain a dict
     * date column (doc 04, "Date axis"). `samplingDateColumn` is the DATE32 column
     * everywhere, for the min/max date-extent read.
     */
    dateColumn: z.string(),
    dateColumnIsDictionaryEncoded: z.boolean(),
    samplingDateColumn: z.string(),
    /** Dictionary/indexed string column backing the location dropdown. */
    locationNameColumn: z.string(),
});
export type SiloInstanceConfig = z.infer<typeof siloInstanceConfigSchema>;

/**
 * URL templates containing the placeholder '{{mutation}}', which are used to construct
 * URLs to mutations in the mutations-over-time component.
 */
export const linkTemplateSchema = z.object({
    nucleotideMutation: z.string(),
    aminoAcidMutation: z.string(),
});
export type LinkTemplate = z.infer<typeof linkTemplateSchema>;

export const WASAP_ANALYSIS_MODE = {
    manual: 'manual',
    variant: 'variant',
    resistance: 'resistance',
    untracked: 'untracked',
    covSpectrumCollection: 'covSpectrumCollection',
    collection: 'collection',
} as const;
export const wasapAnalysisModeSchema = z.enum([
    WASAP_ANALYSIS_MODE.manual,
    WASAP_ANALYSIS_MODE.variant,
    WASAP_ANALYSIS_MODE.resistance,
    WASAP_ANALYSIS_MODE.untracked,
    WASAP_ANALYSIS_MODE.covSpectrumCollection,
    WASAP_ANALYSIS_MODE.collection,
]);
export type WasapAnalysisMode = z.infer<typeof wasapAnalysisModeSchema>;

/**
 * Base settings that apply to all modes.
 */
export const wasapPageConfigBaseSchema = z.object({
    /**
     * The internal identifier of the organism, i.e. 'covid'. Used as a key in maps and API parameters.
     */
    internalName: organismSchema,

    /**
     * The name of the organism, i.e. 'Sars-CoV-2'
     */
    name: z.string(),

    /**
     * The path to the page itself.
     * Used to generate URLs and in the breadcrumbs.
     */
    path: z.string(),

    /**
     * A description of the page to display in the menu.
     */
    description: z.string(),

    /**
     * Object with templates to generate URLs to specific mutations.
     */
    linkTemplate: linkTemplateSchema,

    lapisBaseUrl: z.string(),
    samplingDateField: z.string(),
    locationNameField: z.string(),

    /**
     * Native SILO (RhyDB) coordinates for this organism's wastewater data.
     * The SILO service is the same backend that sits behind `lapisBaseUrl`;
     * `src/rhydb` talks to it directly over SaneQL at `silo.url`.
     */
    silo: siloInstanceConfigSchema,

    defaultLocationName: z.string(),

    browseDataUrl: z.string(),
    browseDataDescription: z.string(),

    defaultAnalysisMode: wasapAnalysisModeSchema.optional(),
});
export type WasapPageConfigBase = z.infer<typeof wasapPageConfigBaseSchema>;

/**
 * Mode-dependent settings, one union per mode: either the mode is off (no
 * `<mode>AnalysisModeEnabled` key at all — zod has no equivalent of TypeScript's
 * `<mode>AnalysisModeEnabled?: never`, so "absent or explicitly `undefined`" is
 * the closest fit, which is what the data below always does in practice), or
 * it's on and carries its settings.
 */
export const manualAnalysisModeConfigSchema = z.union([
    z.object({
        manualAnalysisModeEnabled: z.literal(true),
        filterDefaults: z.object({ manual: wasapManualFilterSchema }),
    }),
    z.object({ manualAnalysisModeEnabled: z.undefined().optional() }),
]);

export const variantAnalysisModeConfigSchema = z.union([
    z.object({
        variantAnalysisModeEnabled: z.literal(true),
        predefinedVariantsSource: z
            .object({
                collectionsUserId: z.number(),
                collectionsTag: z.string(),
                variantSourceLabel: z.string().optional(),
            })
            .optional(),
        clinicalLapis: z.object({
            lapisBaseUrl: z.string(),
            dateField: z.string(),
            lineageField: z.string(),
        }),
        filterDefaults: z.object({ variant: wasapVariantFilterSchema }),
        clinicalSequenceCountWarningThreshold: z.number(),
    }),
    z.object({ variantAnalysisModeEnabled: z.undefined().optional() }),
]);

export const resistanceAnalysisModeConfigSchema = z.union([
    z.object({
        resistanceAnalysisModeEnabled: z.literal(true),
        resistanceMutationCollections: z.array(resistanceMutationCollectionConfigSchema),
        filterDefaults: z.object({ resistance: wasapResistanceFilterSchema }),
    }),
    z.object({ resistanceAnalysisModeEnabled: z.undefined().optional() }),
]);

export const untrackedAnalysisModeConfigSchema = z.union([
    z.object({
        untrackedAnalysisModeEnabled: z.literal(true),
        clinicalLapis: z.object({
            lapisBaseUrl: z.string(),
            cladeField: z.string(),
            lineageField: z.string(),
        }),
        filterDefaults: z.object({ untracked: wasapUntrackedFilterSchema }),
    }),
    z.object({ untrackedAnalysisModeEnabled: z.undefined().optional() }),
]);

export const covSpectrumCollectionAnalysisModeConfigSchema = z.union([
    z.object({
        covSpectrumCollectionAnalysisModeEnabled: z.literal(true),
        collectionsApiBaseUrl: z.string(),
        collectionTitleFilter: z.string(),
        filterDefaults: z.object({ covSpectrumCollection: wasapCovSpectrumCollectionFilterSchema }),
    }),
    z.object({ covSpectrumCollectionAnalysisModeEnabled: z.undefined().optional() }),
]);

export const collectionAnalysisModeConfigSchema = z.union([
    z.object({
        collectionAnalysisModeEnabled: z.literal(true),
        filterDefaults: z.object({ collection: wasapCollectionFilterSchema }),
    }),
    z.object({ collectionAnalysisModeEnabled: z.undefined().optional() }),
]);

/**
 * All config settings for a W-ASAP dashboard page — the external, per-organism
 * unit of `config.json`'s `organisms` array (`src/config/appConfig.ts`).
 *
 * TypeScript narrows on the `<mode>AnalysisModeEnabled` flags the same way it
 * did before this was zod-derived: `if (!config.manualAnalysisModeEnabled) { … }`
 * still leaves `config.filterDefaults.manual` known-present afterwards, because
 * `z.infer` of an intersection-of-unions produces the same kind of TS union a
 * hand-written one would.
 */
export const wasapPageConfigSchema = wasapPageConfigBaseSchema
    .and(manualAnalysisModeConfigSchema)
    .and(variantAnalysisModeConfigSchema)
    .and(resistanceAnalysisModeConfigSchema)
    .and(untrackedAnalysisModeConfigSchema)
    .and(covSpectrumCollectionAnalysisModeConfigSchema)
    .and(collectionAnalysisModeConfigSchema);
export type WasapPageConfig = z.infer<typeof wasapPageConfigSchema>;

/**
 * Convenience function to get the list of enabled modes.
 */
export function enabledAnalysisModes(config: WasapPageConfig): WasapAnalysisMode[] {
    const result: WasapAnalysisMode[] = [];
    if (config.manualAnalysisModeEnabled) {
        result.push('manual');
    }
    if (config.variantAnalysisModeEnabled) {
        result.push('variant');
    }
    if (config.resistanceAnalysisModeEnabled) {
        result.push('resistance');
    }
    if (config.untrackedAnalysisModeEnabled) {
        result.push('untracked');
    }
    if (config.collectionAnalysisModeEnabled) {
        result.push('collection');
    }
    if (config.covSpectrumCollectionAnalysisModeEnabled) {
        result.push('covSpectrumCollection');
    }
    return result;
}

/**
 * Contains mode-independent settings, like the filter for location and date range.
 *
 * Not part of `WasapPageConfig` — this is the *current* filter selection
 * (derived from URL state, see `WasapPageStateHandler`), not a config default.
 */
export type WasapBaseFilter = {
    locationName?: string;
    samplingDate?: DateRangeOption;
    granularity: TemporalGranularity;
    excludeEmpty: boolean;
};

export type WasapFilter = {
    base: WasapBaseFilter;
    analysis: WasapAnalysisFilter;
};
