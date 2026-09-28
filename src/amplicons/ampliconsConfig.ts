import z from 'zod';

/**
 * The primer schemes vendored in `public/primers/`, by the name an organism's config uses for them —
 * the `<scheme>/<amplicon size>/<version>` of quick-lab/primerschemes, where they come from. To add
 * one, vendor its `primer.bed` there (see `public/primers/README.md`) and add it here.
 */
export const KNOWN_PRIMER_SCHEMES = {
    'artic-sars-cov-2/400/v5.3.2': 'primers/covid/ARTIC_v5.3.2/primer.bed',
} as const;

const knownPrimerSchemeSchema = z.enum(
    Object.keys(KNOWN_PRIMER_SCHEMES) as [keyof typeof KNOWN_PRIMER_SCHEMES, ...(keyof typeof KNOWN_PRIMER_SCHEMES)[]],
);

/**
 * Where the amplicons of an organism's data come from: a known, vendored primer scheme, or a primer
 * BED file of the deployment's own. Without it, the amplicon features (like the amplicon coverage
 * page) are off for the organism.
 *
 * Either way it is one scheme for all of an organism's data. When the scheme of the data changes over
 * time (a lab moving to a new ARTIC version, say), this could become a list of schemes, each with the
 * date range (or batches) it applies to — or better, the scheme could be recorded in each batch's
 * metadata, so that no config has to keep up with it.
 */
export const ampliconsConfigSchema = z.union([
    z.object({
        /** One of `KNOWN_PRIMER_SCHEMES`, e.g. `artic-sars-cov-2/400/v5.3.2`. */
        scheme: knownPrimerSchemeSchema,
    }),
    z.object({
        /**
         * A primer BED file (see `primerBed.ts` for the format): a URL, or a path relative to where
         * the app is served, like `primers/custom/primer.bed` for a file put into `public/`. Its
         * coordinates have to be on the reference of the organism's SILO instance.
         */
        bedFile: z.string().min(1),
    }),
]);
export type AmpliconsConfig = z.infer<typeof ampliconsConfigSchema>;

/** The URL to fetch the primer BED file of an amplicons config from. */
export function primerBedUrl(config: AmpliconsConfig, baseUrl: string = import.meta.env.BASE_URL): string {
    const path = 'scheme' in config ? KNOWN_PRIMER_SCHEMES[config.scheme] : config.bedFile;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path) || path.startsWith('/')) {
        return path;
    }
    return `${baseUrl.replace(/\/?$/, '/')}${path}`;
}
