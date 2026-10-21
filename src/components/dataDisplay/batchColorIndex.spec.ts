import { describe, expect, test } from 'vitest';

import { batchColorIndex } from './SamplesOverTimePlot';
import { ColorsRGB } from '../shared/charts/colors';

const paletteSize = Object.keys(ColorsRGB).length;

describe('batchColorIndex', () => {
    test('depends only on the batch itself, not on which other batches exist', () => {
        expect(batchColorIndex('20260206_2526545558')).toBe(batchColorIndex('20260206_1111111111'));
    });

    test('gives neighbouring biweekly batches different colours, also across a new year', () => {
        const batchIds = [
            '20251205_1',
            '20251219_1',
            '20260102_1',
            '20260116_1',
            '20260206_2526545558',
            '20260220_2529664984',
            '20260306_2530611610',
            '20260325_2531482360',
            '20260402_2531558689',
            '20260417_2531696500',
        ];
        const colors = batchIds.map((batchId) => batchColorIndex(batchId) % paletteSize);
        for (let i = 1; i < colors.length; i++) {
            expect(colors[i]).not.toBe(colors[i - 1]);
        }
    });

    test('falls back to a hash for IDs without a date prefix', () => {
        expect(batchColorIndex('B1')).toBe(batchColorIndex('B1'));
        expect(batchColorIndex('B1') % paletteSize).not.toBe(batchColorIndex('B2') % paletteSize);
    });
});
