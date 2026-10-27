import { describe, expect, it } from 'vitest';

import { codonAnchorFor, parseGeneAnnotation } from './geneAnnotation';

describe('parseGeneAnnotation', () => {
    it('reads gene_name and the nucleotide range from a `gene` row (SARS-CoV-2)', () => {
        const text = ['##gff-version 3', '.\t.\tgene\t21563\t25384\t.\t+\t.\tgene_name=S'].join('\n');

        expect(parseGeneAnnotation(text)).toEqual([{ name: 'S', start: 21563, end: 25384 }]);
    });

    it('reads gene_name and the nucleotide range from a `CDS` row (RSV)', () => {
        const text =
            'EPI_ISL_412866\tfeature\tCDS\t70\t489\t.\t.\t0\t' +
            'codon_start=1;db_xref=GeneID:37607636;gene=NS1;gene_name=NS1;Name=NS1;product=nonstructural protein 1';

        expect(parseGeneAnnotation(text)).toEqual([{ name: 'NS1', start: 70, end: 489 }]);
    });

    it('skips rows of a type other than gene/CDS, and comment/blank lines', () => {
        const text = [
            '##gff-version 3',
            '',
            'EPI_ISL_412866\tannotation\tremark\t1\t15225\t.\t.\t.\tmolecule_type=cRNA',
            'EPI_ISL_412866\tfeature\tsource\t1\t15225\t.\t.\t.\tmol_type=viral cRNA',
        ].join('\n');

        expect(parseGeneAnnotation(text)).toEqual([]);
    });

    it('merges several rows with the same gene_name into their combined range', () => {
        const text = ['.\t.\tCDS\t100\t200\t.\t+\t.\tgene_name=X', '.\t.\tCDS\t250\t300\t.\t+\t.\tgene_name=X'].join(
            '\n',
        );

        expect(parseGeneAnnotation(text)).toEqual([{ name: 'X', start: 100, end: 300 }]);
    });

    it('keeps distinct gene_names of the same physical ORF as separate genes (RSV M2-1/M2-2)', () => {
        const text = [
            'EPI_ISL_412866\tfeature\tCDS\t7640\t8224\t.\t.\t0\tgene=M2;gene_name=M2-1;Name=M2-1',
            'EPI_ISL_412866\tfeature\tCDS\t8199\t8465\t.\t.\t0\tgene=M2;gene_name=M2-2;Name=M2-2',
        ].join('\n');

        expect(parseGeneAnnotation(text)).toEqual([
            { name: 'M2-1', start: 7640, end: 8224 },
            { name: 'M2-2', start: 8199, end: 8465 },
        ]);
    });
});

describe('codonAnchorFor', () => {
    const genes = [
        { name: 'ORF1a', start: 266, end: 13468 },
        { name: 'S', start: 21563, end: 25384 },
    ];

    it('finds the gene covering the position and the 1-based codon from its start', () => {
        expect(codonAnchorFor(266, genes)).toEqual({ segment: 'ORF1a', position: 1 });
        expect(codonAnchorFor(268, genes)).toEqual({ segment: 'ORF1a', position: 1 });
        expect(codonAnchorFor(269, genes)).toEqual({ segment: 'ORF1a', position: 2 });
    });

    it('picks the right gene when several are given', () => {
        expect(codonAnchorFor(21566, genes)).toEqual({ segment: 'S', position: 2 });
    });

    it('returns null outside every gene (UTR/intergenic)', () => {
        expect(codonAnchorFor(100, genes)).toBeNull();
        expect(codonAnchorFor(15000, genes)).toBeNull();
    });
});
