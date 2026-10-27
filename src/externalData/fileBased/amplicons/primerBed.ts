/**
 * Parsing a primer scheme BED file into the amplicons it produces.
 *
 * This runs in the browser, on the raw BED file, rather than on a JSON
 * version of it made at build time. The vendored schemes (`public/primers/`)
 * would allow either, but a scheme can also be a BED file of the deployer's
 * own (`amplicons.bedFile` in the config), which only turns up at runtime. So
 * the browser needs the parser anyway, and with it every scheme takes the same
 * path. The files are small (ARTIC v5.3.2: ~15 kB, ~4 kB gzipped), so there is
 * little to gain from a build step. Keeping the vendored files byte-for-byte
 * as upstream has them also keeps them checkable against the upstream md5.
 *
 * The format is the ARTIC / primalscheme primer BED: one primer per line,
 * tab-separated `chrom start end name pool strand [sequence]`, with `start` and
 * `end` 0-based and half-open, and names like `SARS-CoV-2_5_LEFT_0` — the
 * amplicon number, the side, and optionally which of the alternative primers
 * for that site it is.
 */

export type Amplicon = {
    /** The reference sequence (`chrom` column) the amplicon is on, e.g. `MN908947.3`. */
    chrom: string;
    /** The amplicon number from the primer names, e.g. `5` for `SARS-CoV-2_5_LEFT_0`. */
    number: number;
    /** The primer pool, as named in the BED file (usually `1` or `2`). */
    pool: string;
    /** The first position covered by any of its primers (1-based, inclusive). */
    start: number;
    /** The last position covered by any of its primers (1-based, inclusive). */
    end: number;
    /**
     * The first position of the insert, i.e. after the innermost left primer (1-based, inclusive).
     * Reads that have their primers trimmed (as W-ASAP's do) cover only the insert.
     */
    insertStart: number;
    /** The last position of the insert, i.e. before the innermost right primer (1-based, inclusive). */
    insertEnd: number;
};

type Primer = {
    chrom: string;
    /** 0-based, inclusive. */
    start: number;
    /** 0-based, exclusive. */
    end: number;
    amplicon: number;
    side: 'LEFT' | 'RIGHT';
    pool: string;
};

const PRIMER_NAME = /^.+_(\d+)_(LEFT|RIGHT)(?:_.*)?$/;

export class PrimerBedParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PrimerBedParseError';
    }
}

/** The amplicons of a primer BED file, sorted by reference sequence and amplicon number. */
export function parsePrimerBed(text: string): Amplicon[] {
    const primers = text
        .split(/\r?\n/)
        .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
        .filter(({ line }) => line !== '' && !line.startsWith('#'))
        .map(({ line, lineNumber }) => parsePrimerLine(line, lineNumber));

    if (primers.length === 0) {
        throw new PrimerBedParseError('The primer BED file contains no primers.');
    }

    return ampliconsOf(primers);
}

function parsePrimerLine(line: string, lineNumber: number): Primer {
    const columns = line.split('\t');
    if (columns.length < 6) {
        throw new PrimerBedParseError(`Line ${lineNumber}: expected at least 6 tab-separated columns: '${line}'`);
    }
    const [chrom, startText, endText, name, pool] = columns;
    const start = Number(startText);
    const end = Number(endText);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) {
        throw new PrimerBedParseError(`Line ${lineNumber}: invalid primer coordinates ${startText}-${endText}.`);
    }
    const match = PRIMER_NAME.exec(name);
    if (match === null) {
        throw new PrimerBedParseError(
            `Line ${lineNumber}: primer name '${name}' is not of the form <scheme>_<amplicon>_<LEFT|RIGHT>[_<alt>].`,
        );
    }
    return { chrom, start, end, amplicon: Number(match[1]), side: match[2] as Primer['side'], pool };
}

/**
 * One amplicon per `(chrom, amplicon number)`. Alternative primers for the same site (`_LEFT_0`,
 * `_LEFT_1`, ...) are merged: the amplicon spans all of them, and its insert is what lies between the
 * innermost ones, so no primer sequence of any of them is in it.
 */
function ampliconsOf(primers: Primer[]): Amplicon[] {
    const byAmplicon = new Map<string, Primer[]>();
    for (const primer of primers) {
        const key = `${primer.chrom}\t${primer.amplicon}`;
        byAmplicon.set(key, [...(byAmplicon.get(key) ?? []), primer]);
    }

    const amplicons = [...byAmplicon.values()].map((group) => {
        const { chrom, amplicon: number, pool } = group[0];
        const left = group.filter((primer) => primer.side === 'LEFT');
        const right = group.filter((primer) => primer.side === 'RIGHT');
        if (left.length === 0 || right.length === 0) {
            throw new PrimerBedParseError(
                `Amplicon ${number} on ${chrom} lacks a ${left.length === 0 ? 'left' : 'right'} primer.`,
            );
        }
        const insertStart = Math.max(...left.map((primer) => primer.end)) + 1;
        const insertEnd = Math.min(...right.map((primer) => primer.start));
        if (insertEnd < insertStart) {
            throw new PrimerBedParseError(`Amplicon ${number} on ${chrom} has overlapping left and right primers.`);
        }
        return {
            chrom,
            number,
            pool,
            start: Math.min(...left.map((primer) => primer.start)) + 1,
            end: Math.max(...right.map((primer) => primer.end)),
            insertStart,
            insertEnd,
        };
    });

    return amplicons.sort((a, b) => a.chrom.localeCompare(b.chrom) || a.number - b.number);
}
