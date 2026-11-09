import { type Amplicon } from './primerBed';
import { insertCore } from './samplingPositions';
import { type SequenceType } from '../../../domain/mutations';
import { type GeneRange } from '../genome/geneAnnotation';

/**
 * The positions of the primer scheme's amplicon an anchor is in, so they don't have to be told from
 * the coverage around it. The amplicon is the one whose insert core (`insertCore`) holds the anchor,
 * where its reads are the only ones. For amino acids, the anchor's codon is placed on the genome by
 * its first base, and the amplicon's insert is turned into the codons of that gene it holds
 * entirely — the reads are trimmed to the insert, so a codon cut by its edge is never read whole.
 *
 * `undefined` when the scheme or gene annotation isn't there, the anchor isn't in any amplicon's
 * core, or (amino acids) the gene isn't annotated or has no whole codon in the insert.
 */
export function ampliconRange(
    anchor: { sequenceName: string; position: number },
    sequenceType: SequenceType,
    amplicons: readonly Amplicon[] | undefined,
    genes: readonly GeneRange[] | undefined,
): { start: number; end: number } | undefined {
    if (amplicons === undefined) {
        return undefined;
    }
    if (sequenceType === 'nucleotide') {
        const amplicon = ampliconWithCoreAt(anchor.position, amplicons);
        return amplicon === undefined ? undefined : { start: amplicon.insertStart, end: amplicon.insertEnd };
    }

    const gene = genes?.find(({ name }) => name === anchor.sequenceName);
    if (gene === undefined) {
        return undefined;
    }
    const amplicon = ampliconWithCoreAt(gene.start + (anchor.position - 1) * 3, amplicons);
    if (amplicon === undefined) {
        return undefined;
    }
    // The first and last codons whose three bases are all in both the insert and the gene.
    const start = Math.ceil((Math.max(amplicon.insertStart, gene.start) - gene.start) / 3) + 1;
    const end = Math.floor((Math.min(amplicon.insertEnd, gene.end) - gene.start + 1) / 3);
    return start <= end ? { start, end } : undefined;
}

function ampliconWithCoreAt(position: number, amplicons: readonly Amplicon[]): Amplicon | undefined {
    return amplicons.find((amplicon) => {
        const core = insertCore(amplicon, amplicons);
        return position >= core.start && position <= core.end;
    });
}
