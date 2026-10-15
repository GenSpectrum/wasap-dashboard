"""
LolliPop's `deconvolute` command with a bootstrap preset, for a single location and without files:
the request becomes a tally table, which goes through the CLI's preprocessing, its bootstrap
(`_deconvolute_bootstrap` in `lollipop/cli/deconvolute.py`) and its aggregation into a mean and
quantiles per date and variant. The rounds of the bootstrap can be fitted in parts (`fit_rounds`)
and aggregated together (`aggregate`), with the same result as `deconvolve`.
"""

import bisect
import math
import time
from collections import Counter

import lollipop as ll
import numpy as np
import pandas as pd

from .models import UNDETERMINED, DateEstimates, DeconvolutionRequest, DeconvolutionResponse, Estimate

# The CLI's `--seed` never reaches the global generator that `resample_mutations` draws from; seeded
# here, the same request always gets the same intervals.
SEED = 1

# The seconds a round takes, as measured on a Ryzen 5 3600 with random frequencies (real ones
# converge faster): per date and variant, per row of a date's window and variant², and per row
# that the kernel is computed for (all of them, for each date). See `estimate_round_seconds`.
SECONDS_PER_DATE = 9e-4
SECONDS_PER_WINDOW_ROW = 1.6e-8
SECONDS_PER_ROW = 3.4e-8


class DeadlineExceeded(Exception):
    pass


class _KernelDeconv(ll.KernelDeconv):
    """Gives up between the dates of `deconv_all` once `deadline`, a `time.time()`, has passed."""

    def __init__(self, *args, deadline: float, **kwargs):
        super().__init__(*args, **kwargs)
        self.deadline = deadline

    def deconv(self, *args, **kwargs):
        if time.time() > self.deadline:
            raise DeadlineExceeded()
        return super().deconv(*args, **kwargs)


def deconvolve(request: DeconvolutionRequest) -> DeconvolutionResponse:
    return aggregate(request, fit_rounds(request, 0, request.options.bootstraps))


def fit_rounds(request: DeconvolutionRequest, first: int, count: int, deadline: float = math.inf) -> list[pd.DataFrame]:
    """
    The fits of the bootstrap rounds `first` to `first + count`: the same as if all the rounds ran in
    one go, so that they can be split up and run in parallel. Raises `DeadlineExceeded` once the
    `deadline` (a `time.time()`) has passed.
    """
    lineages = list(request.signatures)
    variants = [*lineages, UNDETERMINED]
    if not request.frequencies:
        return []
    tally = _preprocess(_tally(request), lineages)
    if tally.empty:
        return []

    options = request.options
    bootstrap = options.bootstraps > 1
    mutations = tally["mutations"].unique()
    np.random.seed(SEED)
    # Each round of `resample_mutations` draws once, the same number of indices; drawing them for
    # the rounds before `first` gets the generator to where they would have left it.
    for _ in range(first if bootstrap else 0):
        np.random.randint(0, high=len(mutations) // 2, size=len(mutations) // 2)
    rounds = []
    for _ in range(count):
        resampled = ll.resample_mutations(tally, mutations)[0] if bootstrap else tally
        fit = _KernelDeconv(
            resampled[variants],
            resampled["frac"],
            resampled["date"],
            weights=resampled["resample_value"] if bootstrap else None,
            kernel=ll.GaussianKernel(bandwidth=options.bandwidth),
            reg=ll.RobustReg(f_scale=options.f_scale),
            confint=ll.NullConfint(),
            deadline=deadline,
        ).deconv_all(min_tol=options.min_tol)
        rounds.append(fit.fitted)
    return rounds


def estimate_round_seconds(request: DeconvolutionRequest) -> float:
    """
    Roughly how long a round of the bootstrap takes, within a factor of about 1.5 on the measured
    machine: each date is fitted to the rows within its kernel's window (weights of at least
    `min_tol`), with a parameter per variant (and a numerical Jacobian, hence variants²), after
    computing the kernel for every row. The rows are the frequencies and their complements.
    """
    options = request.options
    variants = len(request.signatures) + 1
    rows_per_day = Counter(f.date.toordinal() for f in request.frequencies)
    days = sorted(rows_per_day)
    cumulative = [0]
    for day in days:
        cumulative.append(cumulative[-1] + 2 * rows_per_day[day])
    if options.min_tol > 0:
        # The Gaussian kernel is exp(-distance² / 2 / bandwidth).
        reach = math.sqrt(-2 * options.bandwidth * math.log(options.min_tol))
    else:
        reach = math.inf
    window_rows = sum(
        cumulative[bisect.bisect_right(days, day + reach)] - cumulative[bisect.bisect_left(days, day - reach)]
        for day in days
    )
    return (
        SECONDS_PER_DATE * len(days) * variants
        + SECONDS_PER_WINDOW_ROW * window_rows * variants**2
        + SECONDS_PER_ROW * cumulative[-1] * len(days)
    )


def aggregate(request: DeconvolutionRequest, rounds: list[pd.DataFrame]) -> DeconvolutionResponse:
    """The CLI's aggregation of the rounds: their mean and quantiles per date and variant."""
    variants = [*request.signatures, UNDETERMINED]
    response = DeconvolutionResponse(variants=variants, dates=[])
    if not rounds:
        return response
    lower_quantile = (1 - request.options.confidence_level) / 2
    for date, fits in pd.concat(rounds).groupby(level=0, sort=True):
        # Rounds that drew none of a date's informative mutations fit nothing there.
        fits = fits[np.isfinite(fits[variants]).all(axis=1)]
        if fits.empty:
            continue
        response.dates.append(
            DateEstimates(
                date=date.date(),
                estimates=[
                    Estimate(
                        variant=variant,
                        proportion=fits[variant].mean(),
                        lower=np.quantile(fits[variant], lower_quantile),
                        upper=np.quantile(fits[variant], 1 - lower_quantile),
                    )
                    for variant in variants
                ],
            )
        )
    return response


def _tally(request: DeconvolutionRequest) -> pd.DataFrame:
    """Like the `tallymut` table: one row per frequency, `mut` in the columns of the lineages that carry it."""
    carriers = {
        mutation: [lineage for lineage, mutations in request.signatures.items() if mutation in mutations]
        for mutation in {f.mutation for f in request.frequencies}
    }
    return pd.DataFrame(
        [
            {
                "date": f.date.isoformat(),
                "pos": int(f.mutation[1:-1]),
                "base": f.mutation[-1],
                "frac": f.frac,
                **{lineage: "mut" for lineage in carriers[f.mutation]},
            }
            for f in request.frequencies
        ],
        columns=["date", "pos", "base", "frac", *request.signatures],
    )


def _preprocess(tally: pd.DataFrame, lineages: list[str]) -> pd.DataFrame:
    """The CLI's preprocessing: 0-1 signatures, informative mutations only, plus their complements."""
    return (
        ll.DataPreprocesser(tally)
        .general_preprocess(
            variants_list=lineages,
            variants_pangolin={},
            variants_not_reported=[],
            to_drop=["subset", "revert"],
        )
        .df_tally
    )
