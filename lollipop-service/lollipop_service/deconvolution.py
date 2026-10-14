"""
LolliPop's `deconvolute` command with a bootstrap preset, for a single location and without files:
the request becomes a tally table, which goes through the CLI's preprocessing, its bootstrap
(`_deconvolute_bootstrap` in `lollipop/cli/deconvolute.py`) and its aggregation into a mean and
quantiles per date and variant.
"""

import lollipop as ll
import numpy as np
import pandas as pd

from .models import UNDETERMINED, DateEstimates, DeconvolutionRequest, DeconvolutionResponse, Estimate

# The CLI's `--seed` never reaches the global generator that `resample_mutations` draws from; seeded
# here, the same request always gets the same intervals.
SEED = 1


def deconvolve(request: DeconvolutionRequest) -> DeconvolutionResponse:
    lineages = list(request.signatures)
    variants = [*lineages, UNDETERMINED]
    response = DeconvolutionResponse(variants=variants, dates=[])
    if not request.frequencies:
        return response

    tally = _preprocess(_tally(request), lineages)
    if tally.empty:
        return response

    options = request.options
    bootstrap = options.bootstraps > 1
    np.random.seed(SEED)
    rounds = []
    for _ in range(options.bootstraps):
        resampled = ll.resample_mutations(tally, tally["mutations"].unique())[0] if bootstrap else tally
        fit = ll.KernelDeconv(
            resampled[variants],
            resampled["frac"],
            resampled["date"],
            weights=resampled["resample_value"] if bootstrap else None,
            kernel=ll.GaussianKernel(bandwidth=options.bandwidth),
            reg=ll.RobustReg(f_scale=options.f_scale),
            confint=ll.NullConfint(),
        ).deconv_all(min_tol=options.min_tol)
        rounds.append(fit.fitted)

    lower_quantile = (1 - options.confidence_level) / 2
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
