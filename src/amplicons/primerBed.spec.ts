import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

import { parsePrimerBed, PrimerBedParseError } from './primerBed';

const bed = (...lines: string[]) => lines.join('\n');

describe('parsePrimerBed', () => {
    test('turns a left and right primer into an amplicon with 1-based coordinates', () => {
        const amplicons = parsePrimerBed(
            bed(
                'MN908947.3\t47\t78\tSARS-CoV-2_1_LEFT_1\t1\t+\tCTCTTGTAGATCTGTTCTCTAAACGAACTTT',
                'MN908947.3\t419\t447\tSARS-CoV-2_1_RIGHT_1\t1\t-\tAAAACGCCTTTTTCAACTTCTACTAAGC',
            ),
        );

        expect(amplicons).toEqual([
            { chrom: 'MN908947.3', number: 1, pool: '1', start: 48, end: 447, insertStart: 79, insertEnd: 419 },
        ]);
    });

    test('merges alternative primers, taking the innermost ones for the insert', () => {
        const [amplicon] = parsePrimerBed(
            bed(
                'ref\t100\t120\tscheme_3_LEFT_0\t1\t+',
                'ref\t105\t128\tscheme_3_LEFT_1\t1\t+',
                'ref\t400\t425\tscheme_3_RIGHT_0\t1\t-',
                'ref\t395\t420\tscheme_3_RIGHT_1\t1\t-',
            ),
        );

        expect(amplicon).toMatchObject({ start: 101, end: 425, insertStart: 129, insertEnd: 395 });
    });

    test('accepts names without an alternative suffix, skips comments and blank lines, and sorts', () => {
        const amplicons = parsePrimerBed(
            bed(
                '# a comment',
                'ref\t500\t520\tnCoV-2019_2_LEFT\t2\t+',
                'ref\t800\t820\tnCoV-2019_2_RIGHT\t2\t-',
                '',
                'ref\t10\t30\tnCoV-2019_1_LEFT\t1\t+',
                'ref\t300\t320\tnCoV-2019_1_RIGHT\t1\t-',
            ),
        );

        expect(amplicons.map((amplicon) => [amplicon.number, amplicon.pool])).toEqual([
            [1, '1'],
            [2, '2'],
        ]);
    });

    test.each([
        ['an empty file', ''],
        ['too few columns', 'ref\t10\t30\tx_1_LEFT'],
        ['bad coordinates', 'ref\t30\t10\tx_1_LEFT\t1\t+'],
        ['an unrecognized primer name', 'ref\t10\t30\tprimer1\t1\t+'],
        ['an amplicon without a right primer', 'ref\t10\t30\tx_1_LEFT\t1\t+'],
    ])('rejects %s', (_, text) => {
        expect(() => parsePrimerBed(text)).toThrow(PrimerBedParseError);
    });

    test('parses the vendored ARTIC v5.3.2 scheme into 96 amplicons', () => {
        const text = readFileSync(resolve(__dirname, '../../public/primers/covid/ARTIC_v5.3.2/primer.bed'), 'utf8');

        const amplicons = parsePrimerBed(text);

        expect(amplicons).toHaveLength(96);
        // Insert edges checked against the coverage of live W-ASAP data (primer-trimmed reads).
        expect(amplicons[6]).toMatchObject({ number: 7, insertStart: 1906, insertEnd: 2259 });
        expect(amplicons[13]).toMatchObject({ number: 14, insertStart: 4109, insertEnd: 4457 });
    });
});
