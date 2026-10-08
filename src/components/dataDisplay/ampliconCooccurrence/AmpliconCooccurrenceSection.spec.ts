import { describe, expect, test } from 'vitest';

import { specificRows } from './AmpliconCooccurrenceSection';
import { mutationsByAmplicon } from '../../../amplicons/mutationsByAmplicon';
import { type Amplicon } from '../../../amplicons/primerBed';
import {
    allRowsOf,
    buildAmpliconCooccurrence,
    cooccurrenceRows,
    type AmpliconRows,
} from '../../../dataLayer/hooks/ampliconCooccurrence';
import { buildDateAxis } from '../../../dataLayer/hooks/mutationsOverTime';

const amplicon: Amplicon = { chrom: 'ref', number: 7, pool: '1', start: 1, end: 400, insertStart: 30, insertEnd: 370 };
const { requestedDateRanges } = buildDateAxis([{ name: '2026-06-01', count: 100 }], 'day', {});
const [rows] = cooccurrenceRows(
    [
        buildAmpliconCooccurrence(
            mutationsByAmplicon(['C100T', 'G200A', 'G300A'], [amplicon]).groups[0],
            [],
            requestedDateRanges,
            'day',
        ),
    ],
    [100],
);

const ALL = 'Amplicon 7: C100T + G200A + G300A';
const ANY_TWO = 'Amplicon 7: ≥2 of C100T, G200A, G300A';

function labelsOf(shown: AmpliconRows | undefined) {
    return shown && allRowsOf(shown).map((row) => row.label.replace('Amplicon 7: ', ''));
}

describe('specificRows', () => {
    test('keeps all the rows leaving mutations out where all of the mutations are specific enough', () => {
        expect(labelsOf(specificRows(rows, { [ALL]: 0.9 }, 0.8))).toEqual([
            'C100T + G200A + G300A',
            '≥2 of C100T, G200A, G300A',
            'G200A + G300A',
            'C100T + G300A',
            'C100T + G200A',
            'C100T',
            'G200A',
            'G300A',
        ]);
    });

    test('otherwise keeps the specific clusters, under their row of any k, with the rows to compare them to', () => {
        expect(labelsOf(specificRows(rows, { [ALL]: 0.5, 'Amplicon 7: C100T + G300A': 0.85 }, 0.8))).toEqual([
            'C100T + G200A + G300A',
            '≥2 of C100T, G200A, G300A',
            'C100T + G300A',
            'C100T',
            'G200A',
            'G300A',
        ]);
    });

    test('leaves out an amplicon with nothing specific enough, if only a single mutation is', () => {
        expect(specificRows(rows, { [ALL]: 0.5, [ANY_TWO]: 0.1, 'Amplicon 7: C100T': 0.95 }, 0.8)).toBeUndefined();
    });
});
