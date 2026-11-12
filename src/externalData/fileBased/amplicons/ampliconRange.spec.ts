import { describe, expect, test } from 'vitest';

import { ampliconRange } from './ampliconRange';
import { type Amplicon } from './primerBed';

function amplicon(number: number, insertStart: number, insertEnd: number): Amplicon {
    return { chrom: 'ref', number, pool: '1', start: insertStart - 20, end: insertEnd + 20, insertStart, insertEnd };
}

// Cores: 1 → 100–349, 2 → 401–649, 3 → 701–1000.
const amplicons = [amplicon(1, 100, 400), amplicon(2, 350, 700), amplicon(3, 650, 1000)];
const main = (position: number) => ({ sequenceName: 'main', position });

describe('ampliconRange, nucleotide', () => {
    test('is the insert of the amplicon whose core holds the anchor', () => {
        expect(ampliconRange(main(500), 'nucleotide', amplicons, undefined)).toEqual({ start: 350, end: 700 });
    });

    test('is nothing for an anchor in an overlap, where reads of two amplicons are', () => {
        expect(ampliconRange(main(375), 'nucleotide', amplicons, undefined)).toBeUndefined();
    });

    test('is nothing outside every amplicon, or without a primer scheme', () => {
        expect(ampliconRange(main(50), 'nucleotide', amplicons, undefined)).toBeUndefined();
        expect(ampliconRange(main(500), 'nucleotide', undefined, undefined)).toBeUndefined();
    });
});

describe('ampliconRange, amino acid', () => {
    // Codon n of S covers bases 500 + 3(n - 1) to 502 + 3(n - 1).
    const genes = [{ name: 'S', start: 500, end: 2000 }];
    const s = (position: number) => ({ sequenceName: 'S', position });

    test('is the whole codons of the gene in the insert, cut at the gene start', () => {
        // Codon 10 starts at 527, in amplicon 2's core; its insert 350–700 holds S bases 500–700,
        // codons 1 (500–502) to 67 (698–700).
        expect(ampliconRange(s(10), 'amino acid', amplicons, genes)).toEqual({ start: 1, end: 67 });
    });

    test('leaves out the codons the insert edges cut', () => {
        // Codon 80 starts at 737, in amplicon 3's core; its insert 650–1000 starts in codon 51
        // (650–652, whole) and ends in codon 167 (998–1000, whole).
        expect(ampliconRange(s(80), 'amino acid', amplicons, genes)).toEqual({ start: 51, end: 167 });
        const shifted = [amplicon(1, 100, 400), amplicon(2, 350, 700), amplicon(3, 651, 999)];
        // 651 is the middle of codon 51 and 999 of codon 167: both are left out.
        expect(ampliconRange(s(80), 'amino acid', shifted, genes)).toEqual({ start: 52, end: 166 });
    });

    test('is nothing without the gene annotation, or for a gene it lacks', () => {
        expect(ampliconRange(s(10), 'amino acid', amplicons, undefined)).toBeUndefined();
        expect(ampliconRange({ sequenceName: 'N', position: 10 }, 'amino acid', amplicons, genes)).toBeUndefined();
    });

    test('is nothing for a codon outside every amplicon core', () => {
        // Codon 700 starts at 2597, past the scheme.
        expect(ampliconRange(s(700), 'amino acid', amplicons, genes)).toBeUndefined();
    });
});
