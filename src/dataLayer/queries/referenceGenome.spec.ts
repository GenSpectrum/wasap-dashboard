import { describe, expect, test } from 'vitest';

import { readReferenceGenome, readTableColumns, referenceGenomeQuery, tableColumnsQuery } from './referenceGenome';

describe('the reference genome', () => {
    test('is the whole reference_genomes table', () => {
        expect(referenceGenomeQuery().render()).toBe('reference_genomes');
    });

    test('keeps the name, symbols and length of each segment and gene, in the order sent', () => {
        expect(
            readReferenceGenome(
                [
                    { name: 'main', sequence: 'ACGTACGT', type: 'nucleotide' },
                    { name: 'S', sequence: 'MFV*', type: 'amino_acid' },
                    { name: 'E', sequence: 'MY', type: 'amino_acid' },
                ],
                'data',
                ['main', 'S', 'E', 'readId'],
            ),
        ).toEqual({
            nucleotideSequences: [{ name: 'main', sequence: 'ACGTACGT', length: 8 }],
            genes: [
                { name: 'S', sequence: 'MFV*', length: 4 },
                { name: 'E', sequence: 'MY', length: 2 },
            ],
        });
    });

    test('an unknown type throws and names the column', () => {
        expect(() => readReferenceGenome([{ name: 'x', sequence: 'A', type: 'protein' }], 'data', ['x'])).toThrow(
            'type',
        );
    });

    test("is matched up against the table's columns from its schema", () => {
        expect(tableColumnsQuery('rsva').render()).toBe('rsva.schema()');
        expect(readTableColumns([{ fieldName: 'F', type: 'STRING' }])).toEqual(['F']);
    });

    describe('in a reference_genomes table shared between tables', () => {
        const shared = [
            { name: 'main', sequence: 'ACGT', type: 'nucleotide' },
            { name: 'M', sequence: 'MAD', type: 'amino_acid' },
            { name: 'S', sequence: 'MFV', type: 'amino_acid' },
            { name: 'rsva_main', sequence: 'GGGGG', type: 'nucleotide' },
            { name: 'rsva_M', sequence: 'METR', type: 'amino_acid' },
            { name: 'rsva_F', sequence: 'MELP', type: 'amino_acid' },
            { name: 'rsvb_main', sequence: 'TTT', type: 'nucleotide' },
        ];

        test('the unprefixed table keeps only the rows named after its columns', () => {
            expect(readReferenceGenome(shared, 'data', ['main', 'M', 'S', 'readId'])).toEqual({
                nucleotideSequences: [{ name: 'main', sequence: 'ACGT', length: 4 }],
                genes: [
                    { name: 'M', sequence: 'MAD', length: 3 },
                    { name: 'S', sequence: 'MFV', length: 3 },
                ],
            });
        });

        test('a prefixed table takes its own rows, named after its columns, over same-named ones', () => {
            expect(readReferenceGenome(shared, 'rsva', ['main', 'M', 'F', 'readId'])).toEqual({
                nucleotideSequences: [{ name: 'main', sequence: 'GGGGG', length: 5 }],
                genes: [
                    { name: 'M', sequence: 'METR', length: 4 },
                    { name: 'F', sequence: 'MELP', length: 4 },
                ],
            });
        });
    });
});
