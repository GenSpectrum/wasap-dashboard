// SPDX-License-Identifier: GPL-3.0-or-later
// Derived from LolliPop (https://github.com/cbg-ethz/LolliPop); see lollipop/README.md.

import { describe, expect, it } from 'vitest';

import reference from './__fixtures__/lollipopReference.json';
import { DEFAULT_DECONVOLUTION_OPTIONS, deconvolve, UNDETERMINED } from './kernelDeconvolution';

describe('deconvolve', () => {
    it('should recover the mix of a sample without noise', () => {
        const signatures = { A: ['C1T', 'C2T'], B: ['C2T', 'C3T'], C: ['C4T'] };
        // 70 % A, 30 % B, no C
        const frequencies = [
            { date: '2026-01-01', mutation: 'C1T', frac: 0.7 },
            { date: '2026-01-01', mutation: 'C2T', frac: 1 },
            { date: '2026-01-01', mutation: 'C3T', frac: 0.3 },
            { date: '2026-01-01', mutation: 'C4T', frac: 0 },
        ];
        // One round with every mutation once: the fit of the data itself.
        const resamples = [{ C1T: 1, C2T: 1, C3T: 1, C4T: 1 }];

        const result = deconvolve({ signatures, frequencies, options: DEFAULT_DECONVOLUTION_OPTIONS, resamples });

        expect(result.variants).toEqual(['A', 'B', 'C', UNDETERMINED]);
        const proportions = result.dates[0].estimates.map((estimate) => estimate.proportion);
        expect(proportions[0]).toBeCloseTo(0.7, 6);
        expect(proportions[1]).toBeCloseTo(0.3, 6);
        expect(proportions[2]).toBeCloseTo(0, 6);
        expect(proportions[3]).toBeCloseTo(0, 6);
    });

    it('should only use the mutations that tell the lineages apart', () => {
        const signatures = { A: ['C1T', 'C2T'], B: ['C2T', 'C3T'] };
        const result = deconvolve({ signatures, frequencies: [], options: DEFAULT_DECONVOLUTION_OPTIONS });

        expect(result.informativeMutations).toEqual(['C1T', 'C3T']);
        expect(result.dates).toEqual([]);
    });

    it('should weigh in neighbouring samples by the kernel', () => {
        const signatures = { A: ['C1T'], B: ['C2T'] };
        const sample = (date: string, a: number) => [
            { date, mutation: 'C1T', frac: a },
            { date, mutation: 'C2T', frac: 1 - a },
        ];
        const frequencies = [...sample('2026-01-01', 1), ...sample('2026-01-03', 0)];
        const resamples = [{ C1T: 1, C2T: 1 }];

        const result = deconvolve({ signatures, frequencies, options: DEFAULT_DECONVOLUTION_OPTIONS, resamples });

        const a = result.dates.map(({ estimates }) => estimates[0].proportion);
        expect(a[0]).toBeGreaterThan(0.5);
        expect(a[0]).toBeLessThan(1);
        expect(a[1]).toBeCloseTo(1 - a[0], 6);
    });

    it('should give the same intervals for the same input', () => {
        const input = {
            signatures: reference.signatures,
            frequencies: reference.frequencies.filter((frequency) => frequency.date >= '2026-08-01'),
            options: { ...reference.options, bootstraps: 10 },
        };

        const first = deconvolve(input);

        expect(deconvolve(input)).toEqual(first);
        for (const { estimates } of first.dates) {
            for (const { lower, upper } of estimates) {
                expect(lower).toBeLessThanOrEqual(upper);
            }
        }
    });

    it('should match LolliPop on real data, replaying its bootstrap draws', () => {
        const result = deconvolve({
            signatures: reference.signatures,
            frequencies: reference.frequencies,
            options: reference.options,
            resamples: reference.resamples,
        });

        const actual = result.dates.flatMap(({ date, estimates }) =>
            estimates.map((estimate) => ({ date, ...estimate })),
        );
        expect(actual.map(({ date, variant }) => ({ date, variant }))).toEqual(
            reference.expected.map(({ date, variant }) => ({ date, variant })),
        );
        // Where few samples carry weight, the loss is nearly flat and the two solvers stop a little
        // apart (see `TOLERANCE`); almost everywhere else they agree closely.
        const differences = actual.flatMap((estimate, i) => {
            const expected = reference.expected[i];
            return [
                Math.abs(estimate.proportion - expected.proportion),
                Math.abs(estimate.lower - expected.lower),
                Math.abs(estimate.upper - expected.upper),
            ];
        });
        expect(Math.max(...differences)).toBeLessThan(0.01);
        expect(differences.filter((difference) => difference > 1e-4).length / differences.length).toBeLessThan(0.05);
    });
});
