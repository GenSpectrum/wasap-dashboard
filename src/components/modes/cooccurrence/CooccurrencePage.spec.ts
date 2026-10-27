import { describe, expect, test } from 'vitest';

import { usesDefaultAmplicon, withDefaultAmplicon } from './CooccurrencePage';
import { type Amplicon } from '../../../externalData/fileBased/amplicons/primerBed';
import { ampliconAnchor } from '../../../externalData/fileBased/amplicons/samplingPositions';
import { type WasapCooccurrenceFilter } from '../../../pageState/wasap/wasapAnalysisFilter';

function amplicon(number: number, insertStart: number, insertEnd: number): Amplicon {
    return { chrom: 'ref', number, pool: '1', start: insertStart - 20, end: insertEnd + 20, insertStart, insertEnd };
}

const nothingPicked: WasapCooccurrenceFilter = { mode: 'cooccurrence', sequenceType: 'nucleotide' };

describe('usesDefaultAmplicon', () => {
    test('picks the default amplicon when nothing is picked', () => {
        expect(usesDefaultAmplicon(nothingPicked, 74)).toBe(true);
    });

    test('does not without a default amplicon', () => {
        expect(usesDefaultAmplicon(nothingPicked, undefined)).toBe(false);
    });

    test('leaves an amplicon picked in the URL', () => {
        expect(usesDefaultAmplicon({ ...nothingPicked, anchorPosition: '7966' }, 74)).toBe(false);
    });

    test('leaves the manual positions alone, even when there are none', () => {
        expect(usesDefaultAmplicon({ ...nothingPicked, positionSource: 'manual' }, 74)).toBe(false);
    });

    test('is only for nucleotides', () => {
        expect(usesDefaultAmplicon({ ...nothingPicked, sequenceType: 'amino acid' }, 74)).toBe(false);
    });
});

describe('withDefaultAmplicon', () => {
    const amplicons = [amplicon(1, 100, 400), amplicon(2, 350, 700), amplicon(3, 650, 1000)];

    test('picks the amplicon by the position the amplicon picker takes', () => {
        expect(withDefaultAmplicon(nothingPicked, 2, amplicons).anchorPosition).toBe(
            ampliconAnchor(amplicons[1], amplicons),
        );
    });

    test('picks nothing for an amplicon that is not in the primer scheme', () => {
        expect(withDefaultAmplicon(nothingPicked, 74, amplicons)).toEqual(nothingPicked);
    });
});
