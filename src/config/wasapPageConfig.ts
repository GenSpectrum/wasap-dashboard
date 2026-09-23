import z from 'zod';

import {
    wasapAnalysisModeSchema,
    wasapCollectionFilterSchema,
    wasapManualFilterSchema,
    wasapResistanceFilterSchema,
    wasapUntrackedFilterSchema,
    wasapVariantFilterSchema,
    type WasapAnalysisMode,
} from '../pageState/wasap/wasapAnalysisFilter';

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

/**
 * Base settings that apply to all modes.
 */
export const wasapPageConfigBaseSchema = z.object({
    /**
     * GenSpectrum's own identifier for the organism, i.e. 'covid'. Used as a
     * cache-key component and as the `organism` parameter on GenSpectrum
     * collections-API requests (`getCollections`). Config-supplied, not
     * validated against a fixed list — this deployment's config.json is the
     * source of truth for which organisms exist.
     */
    genSpectrumOrganismName: z.string().min(1),

    /**
     * The name of the organism, i.e. 'Sars-CoV-2'
     */
    name: z.string(),

    /**
     * The path to the page of the organism, like `/covid`. The pages of the
     * analysis modes are below it (`/covid/manual`).
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

    /** The mode that the bare organism URL (like `/covid`) goes to. The first enabled mode if not set. */
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

/**
 * The CoV-Spectrum collection source, which an organism opts into independently of (and only
 * together with) the collection mode above.
 */
export const covSpectrumCollectionSourceConfigSchema = z.union([
    z.object({
        covSpectrumCollectionSourceEnabled: z.literal(true),
        collectionsApiBaseUrl: z.string(),
        collectionTitleFilter: z.string(),
    }),
    z.object({ covSpectrumCollectionSourceEnabled: z.undefined().optional() }),
]);

/**
 * The collection mode is enabled iff this is present: GenSpectrum's own collections are always
 * available then, and CoV-Spectrum's are an independent, optional addition (see
 * `covSpectrumCollectionSourceConfigSchema` above) — not every organism has a CoV-Spectrum
 * instance to pull collections from.
 */
export const collectionAnalysisModeConfigSchema = z
    .union([
        z.object({
            collectionAnalysisModeEnabled: z.literal(true),
            filterDefaults: z.object({ collection: wasapCollectionFilterSchema }),
            /**
             * URL template for linking out to this collection on GenSpectrum, with
             * the placeholder `{{id}}`, e.g. `https://genspectrum.org/collections/covid/{{id}}`.
             * GenSpectrum's collections-page URL slug isn't necessarily formatted
             * the same as `genSpectrumOrganismName` (the API's organism
             * identifier), so it's baked into the template rather than derived.
             */
            genSpectrumCollectionLinkOut: z.string(),
        }),
        z.object({ collectionAnalysisModeEnabled: z.undefined().optional() }),
    ])
    .and(covSpectrumCollectionSourceConfigSchema);

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
    return result;
}

const MODE_ENABLED_FLAGS = {
    manual: 'manualAnalysisModeEnabled',
    variant: 'variantAnalysisModeEnabled',
    resistance: 'resistanceAnalysisModeEnabled',
    untracked: 'untrackedAnalysisModeEnabled',
    collection: 'collectionAnalysisModeEnabled',
} as const satisfies Record<WasapAnalysisMode, string>;

/**
 * The config of a page where the given mode is enabled, so that the settings
 * of that mode (like `filterDefaults.manual`) are known to be there.
 */
export type WasapPageConfigFor<Mode extends WasapAnalysisMode> = Extract<
    WasapPageConfig,
    { [Flag in (typeof MODE_ENABLED_FLAGS)[Mode]]: true }
>;

export function isModeEnabled<Mode extends WasapAnalysisMode>(
    config: WasapPageConfig,
    mode: Mode,
): config is WasapPageConfigFor<Mode> {
    return config[MODE_ENABLED_FLAGS[mode]] === true;
}

/**
 * The mode that a bare organism URL shows: the configured default, or else the
 * first enabled mode. `undefined` if no mode is enabled at all.
 */
export function getDefaultAnalysisMode(config: WasapPageConfig): WasapAnalysisMode | undefined {
    const enabled = enabledAnalysisModes(config);
    return config.defaultAnalysisMode !== undefined && enabled.includes(config.defaultAnalysisMode)
        ? config.defaultAnalysisMode
        : enabled[0];
}

/**
 * For code that has been given the config of a page whose mode is known to be enabled
 * (see `EnabledModeRoute`), but has to get the type to say so.
 */
export function assertModeEnabled<Mode extends WasapAnalysisMode>(
    config: WasapPageConfig,
    mode: Mode,
): asserts config is WasapPageConfigFor<Mode> {
    if (!isModeEnabled(config, mode)) {
        throw Error(`The '${mode}' analysis mode is not enabled.`);
    }
}
