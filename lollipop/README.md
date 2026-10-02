# lollipop

A TypeScript port of the deconvolution of [LolliPop](https://github.com/cbg-ethz/LolliPop), the tool
behind the Swiss wastewater variant curves: from the frequencies of mutations in wastewater samples to
the prevalences of a panel of lineages over time, with confidence intervals. It runs in the browser
(in a worker), for the dashboard's deconvolution page.

Licensed under the **GPL-3.0-or-later**, like LolliPop, which this is derived from — see
[`LICENSE.md`](LICENSE.md). The rest of this repository is AGPL-3.0-only; the two licenses can be
combined (section 13 of both).

## What it does

Each lineage of the panel is described by its signature, the mutations it carries. A sample's
frequency of a mutation is then the summed prevalence of the lineages that carry it, so the
prevalences are what a regression of the frequencies on the signatures finds. For every sampling
date:

- a robust (soft L1) non-negative regression over all samples, each weighted by a Gaussian kernel of
  its distance in days, renormalized to sum to 1. Every mutation also gives a complement row (the
  reference base), carried by an extra `undetermined` lineage that takes up what the panel doesn't
  explain;
- repeated in a bootstrap over the mutations (drawn with replacement): the estimate is the mean of
  the rounds, the confidence interval their quantiles.

The defaults are LolliPop's `deconv_bootstrap_cowwid` preset, the one of the Swiss surveillance:
bandwidth 10 (the kernel's variance, in days²), `min_tol` 0.001, `f_scale` 0.01, 100 bootstrap rounds,
95 % intervals.

```ts
import { DEFAULT_DECONVOLUTION_OPTIONS, deconvolve } from '../lollipop';

const result = deconvolve({
    signatures: { XFG: ['C241T', …], 'NB.1.8.1': […] },
    frequencies: [{ date: '2026-05-04', mutation: 'C241T', frac: 0.42 }, …],
    options: DEFAULT_DECONVOLUTION_OPTIONS,
});
// result.dates[i].estimates[j]: { variant, proportion, lower, upper }
```

Where the signatures and frequencies come from is up to the caller (the dashboard: Nextclade's
reference tree, and base counts from SILO).

## Files

| File                     | Ported from LolliPop                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `kernelDeconvolution.ts` | `kernels.py` (Gaussian), `kerneldeconv.py`, the complement rows of `preprocessors.py`, the bootstrap of `cli/deconvolute.py` |
| `softL1.ts`              | stands in for `scipy.optimize.least_squares(loss='soft_l1')`, which `regressors.py`'s `RobustReg` uses                       |
| `linearAlgebra.ts`       | stands in for `scipy.optimize.nnls` and `numpy.linalg.inv`                                                                   |
| `__fixtures__/`          | LolliPop's own output on real data, and the script that makes it                                                             |

## Differences from LolliPop

- **Only the bootstrap preset.** No Wald intervals, no box kernel, no linear robust regressor
  options, none of the input handling (variant renaming, mutation filters, date intervals per variant).
- **The solver.** `softL1.ts` finds the same minimum as SciPy, but where few samples carry weight the
  loss is so flat that the two stop a little apart: up to a few tenths of a percent in the
  prevalences, at losses equal to within 1e-9. The upper bound of 1 on the coefficients is left out:
  they are prevalences that add up to about 1, so it doesn't bind in practice.
- **The random draws.** The bootstrap draws with its own seeded generator, so the intervals are the
  same for the same input, but not the same as LolliPop's for the same seed.

LolliPop's quirks are kept, so that the results match: the bandwidth is the kernel's variance, not its
standard deviation, and the rows are scaled by the kernel weight itself, not its square root.

## Tests

`kernelDeconvolution.spec.ts` replays LolliPop's own bootstrap draws on the fixture and compares the
results. To regenerate the fixture (it pulls live data, so the result changes over time):

```sh
pip install numpy scipy pandas
PYTHONPATH=path/to/LolliPop python lollipop/__fixtures__/lollipopReference.py
```

## Citation

If you use this in your research, please cite LolliPop:

> David Dreifuss, Ivan Topolsky, Pelin Icer Baykal & Niko Beerenwinkel. "Tracking SARS-CoV-2 genomic
> variants in wastewater sequencing data with LolliPop." medRxiv;
> [doi:10.1101/2022.11.02.22281825](https://doi.org/10.1101/2022.11.02.22281825)
