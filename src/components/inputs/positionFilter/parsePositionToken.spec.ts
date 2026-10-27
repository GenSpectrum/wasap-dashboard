import { describe, expect, test } from 'vitest';

import { parsePositionToken } from './parsePositionToken';

describe('parsePositionToken', () => {
    test('nucleotide: a bare number is a position', () => {
        expect(parsePositionToken('23403', 'nucleotide')).toEqual({
            label: '23403',
            segment: undefined,
            position: 23403,
        });
    });

    test('nucleotide: whitespace is trimmed', () => {
        expect(parsePositionToken('  241  ', 'nucleotide')).toEqual({
            label: '241',
            segment: undefined,
            position: 241,
        });
    });

    test('nucleotide: rejects a gene-qualified token', () => {
        expect(parsePositionToken('S:501', 'nucleotide')).toBeNull();
    });

    test('nucleotide: rejects a full mutation code (has ref/alt symbols)', () => {
        expect(parsePositionToken('A23403G', 'nucleotide')).toBeNull();
        expect(parsePositionToken('23403G', 'nucleotide')).toBeNull();
    });

    test('nucleotide: rejects a deletion token', () => {
        expect(parsePositionToken('23403-', 'nucleotide')).toBeNull();
    });

    test('nucleotide: rejects empty input', () => {
        expect(parsePositionToken('', 'nucleotide')).toBeNull();
        expect(parsePositionToken('   ', 'nucleotide')).toBeNull();
    });

    test('amino acid: requires a gene prefix', () => {
        expect(parsePositionToken('501', 'amino acid')).toBeNull();
    });

    test('amino acid: a gene-qualified position parses, case preserved', () => {
        expect(parsePositionToken('S:501', 'amino acid')).toEqual({ label: 'S:501', segment: 'S', position: 501 });
    });

    test('amino acid: rejects a full mutation code (has ref/alt symbols)', () => {
        expect(parsePositionToken('S:501Y', 'amino acid')).toBeNull();
        expect(parsePositionToken('S:N501Y', 'amino acid')).toBeNull();
    });

    test('amino acid: a multi-character gene name is accepted', () => {
        expect(parsePositionToken('ORF1a:441', 'amino acid')).toEqual({
            label: 'ORF1a:441',
            segment: 'ORF1a',
            position: 441,
        });
    });

    test('rejects garbage', () => {
        expect(parsePositionToken('not-a-position', 'nucleotide')).toBeNull();
        expect(parsePositionToken('not-a-position', 'amino acid')).toBeNull();
    });
});
