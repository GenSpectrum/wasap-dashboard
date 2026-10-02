import { describe, expect, it } from 'vitest';

import { deconvolutionOptions } from './granularityOptions';
import { DEFAULT_DECONVOLUTION_OPTIONS } from '../../lollipop';

describe('deconvolutionOptions', () => {
    it("keeps LolliPop's preset by day", () => {
        expect(deconvolutionOptions('day')).toEqual(DEFAULT_DECONVOLUTION_OPTIONS);
    });

    it('lets the neighbouring week count 60 % by week', () => {
        const { bandwidth } = deconvolutionOptions('week');

        expect(Math.exp(-(7 ** 2) / 2 / bandwidth)).toBeCloseTo(0.6, 10);
        expect(bandwidth).toBeCloseTo(48, 0);
    });
});
