/**
 * EXPERIMENTAL: parsing a Nextclade dataset's `genome_annotation.gff3` (the sibling of the
 * `tree.json` the lineage tree already comes from) into each gene's nucleotide range, just enough
 * to translate a nucleotide genome position into a gene:codon one — see `codonAnchorFor`.
 *
 * Nextclade datasets name the feature type differently per pathogen: SARS-CoV-2's annotation has
 * one `gene` row per gene; RSV's has one `CDS` row per gene (sometimes several for one physical
 * ORF, like M2's M2-1/M2-2, but each still its own simple, contiguous, +-strand coding region —
 * there's no multi-segment/frameshift CDS to walk in either dataset checked against this, so a
 * single start/end per gene name is enough). Everything SARS-CoV-2 and RSV define is `+` strand;
 * `-` strand genes aren't handled.
 */

const FEATURE_TYPES = new Set(['gene', 'CDS']);

export type GeneRange = {
    /** As `gene_name` (RSV) or `Name` names it — the name RhyDB's amino-acid sequence is under. */
    name: string;
    /** 1-based, inclusive. */
    start: number;
    /** 1-based, inclusive. */
    end: number;
};

export function parseGeneAnnotation(text: string): GeneRange[] {
    const byName = new Map<string, GeneRange>();
    for (const line of text.split(/\r?\n/)) {
        if (line === '' || line.startsWith('#')) {
            continue;
        }
        const columns = line.split('\t');
        if (columns.length < 9) {
            continue;
        }
        const [, , type, startText, endText, , , , attributes] = columns;
        if (!FEATURE_TYPES.has(type)) {
            continue;
        }
        const name = attributeValue(attributes, 'gene_name') ?? attributeValue(attributes, 'Name');
        const start = Number(startText);
        const end = Number(endText);
        if (name === undefined || !Number.isInteger(start) || !Number.isInteger(end) || end < start) {
            continue;
        }

        const existing = byName.get(name);
        if (existing === undefined) {
            byName.set(name, { name, start, end });
        } else {
            existing.start = Math.min(existing.start, start);
            existing.end = Math.max(existing.end, end);
        }
    }
    return [...byName.values()];
}

function attributeValue(attributes: string, key: string): string | undefined {
    for (const pair of attributes.split(';')) {
        const [pairKey, value] = pair.split('=');
        if (pairKey === key) {
            return value;
        }
    }
    return undefined;
}

/**
 * The gene:codon a nucleotide position falls in, or `null` if it's outside every known gene (a
 * UTR, or an intergenic position). The codon containing `position`, 1-based from the gene's start
 * — not adjusted for `codon_start`/reading-frame offsets, which are 1 (no offset) in both the
 * SARS-CoV-2 and RSV annotations this was checked against.
 */
export function codonAnchorFor(
    position: number,
    genes: readonly GeneRange[],
): { segment: string; position: number } | null {
    const gene = genes.find((candidate) => position >= candidate.start && position <= candidate.end);
    if (gene === undefined) {
        return null;
    }
    return { segment: gene.name, position: Math.floor((position - gene.start) / 3) + 1 };
}
