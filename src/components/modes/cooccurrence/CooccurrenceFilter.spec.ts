import { describe, expect, test } from 'vitest';

import { aminoAcidAmpliconAnchor, translateAmpliconAnchor } from './CooccurrenceFilter';
import { type Amplicon } from '../../../externalData/fileBased/amplicons/primerBed';
import { ampliconAnchor } from '../../../externalData/fileBased/amplicons/samplingPositions';

function amplicon(number: number, insertStart: number, insertEnd: number): Amplicon {
    return { chrom: 'ref', number, pool: '1', start: insertStart - 20, end: insertEnd + 20, insertStart, insertEnd };
}

describe('translateAmpliconAnchor', () => {
    const amplicons = [amplicon(1, 100, 400), amplicon(2, 350, 700), amplicon(3, 650, 1000)];
    // Amplicon 1's core lies before the gene, the others' in it.
    const aminoAcid = aminoAcidAmpliconAnchor([{ name: 'S', start: 500, end: 2000 }]);

    test('keeps the amplicon from nucleotide to amino acid and back', () => {
        const nucleotideAnchor = ampliconAnchor(amplicons[1], amplicons);
        const aminoAcidAnchor = translateAmpliconAnchor(nucleotideAnchor, ampliconAnchor, aminoAcid, amplicons);

        expect(aminoAcidAnchor).toBe(aminoAcid(amplicons[1], amplicons));
        expect(aminoAcidAnchor).toMatch(/^S:\d+$/);
        expect(translateAmpliconAnchor(aminoAcidAnchor, aminoAcid, ampliconAnchor, amplicons)).toBe(nucleotideAnchor);
    });

    test('drops an amplicon without a coding region', () => {
        const nucleotideAnchor = ampliconAnchor(amplicons[0], amplicons);
        expect(translateAmpliconAnchor(nucleotideAnchor, ampliconAnchor, aminoAcid, amplicons)).toBeUndefined();
    });

    test('drops a position that is no amplicon anchor', () => {
        expect(translateAmpliconAnchor('12345', ampliconAnchor, aminoAcid, amplicons)).toBeUndefined();
    });

    test('drops the pick while the gene annotation or amplicons load', () => {
        const nucleotideAnchor = ampliconAnchor(amplicons[1], amplicons);
        expect(translateAmpliconAnchor(nucleotideAnchor, ampliconAnchor, undefined, amplicons)).toBeUndefined();
        expect(translateAmpliconAnchor(nucleotideAnchor, ampliconAnchor, aminoAcid, undefined)).toBeUndefined();
    });

    test('leaves nothing picked', () => {
        expect(translateAmpliconAnchor(undefined, ampliconAnchor, aminoAcid, amplicons)).toBeUndefined();
    });
});
