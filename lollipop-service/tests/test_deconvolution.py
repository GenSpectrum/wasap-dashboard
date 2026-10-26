import datetime

import numpy as np
import pytest

from lollipop_service.deconvolution import (
    DeadlineExceeded,
    aggregate,
    deconvolve,
    estimate_round_seconds,
    fit_rounds,
)
from lollipop_service.models import DEFAULT_OPTIONS, DeconvolutionRequest, MutationFrequency

SIGNATURES = {
    "A": ["C100T", "G200A", "T300C", "A400G"],
    "B": ["C100T", "C500T", "G600A", "T700C"],
    "C": ["A800G", "C900T", "G1000A", "T300C"],
}
START = datetime.date(2026, 9, 1)


def mixture_request(shares, days=20, bootstraps=1, noise=0.01):
    """Samples on `days` days of a mix of `SIGNATURES` in the given shares, with some noise."""
    rng = np.random.default_rng(0)
    mutations = sorted({m for mutations in SIGNATURES.values() for m in mutations})
    frequencies = [
        MutationFrequency(
            date=START + datetime.timedelta(days=day),
            mutation=mutation,
            frac=float(
                np.clip(
                    sum(share for lineage, share in shares.items() if mutation in SIGNATURES[lineage])
                    + rng.normal(0, noise),
                    0,
                    1,
                )
            ),
        )
        for day in range(days)
        for mutation in mutations
    ]
    return DeconvolutionRequest(
        signatures=SIGNATURES,
        frequencies=frequencies,
        options=DEFAULT_OPTIONS.model_copy(update={"bootstraps": bootstraps}),
    )


def proportions(response):
    return {
        (date.date, estimate.variant): estimate.proportion for date in response.dates for estimate in date.estimates
    }


def test_recovers_the_shares_of_a_mixture():
    shares = {"A": 0.6, "B": 0.3, "C": 0.1}
    response = deconvolve(mixture_request(shares))

    assert response.variants == ["A", "B", "C", "undetermined"]
    assert [date.date for date in response.dates] == [START + datetime.timedelta(days=day) for day in range(20)]
    for date in response.dates:
        by_variant = {estimate.variant: estimate.proportion for estimate in date.estimates}
        for lineage, share in shares.items():
            assert by_variant[lineage] == pytest.approx(share, abs=0.02)
        assert by_variant["undetermined"] == pytest.approx(0, abs=0.02)


def test_bootstrap_intervals_contain_the_mean_and_are_reproducible():
    request = mixture_request({"A": 0.5, "B": 0.5}, days=8, bootstraps=10, noise=0.05)
    response = deconvolve(request)

    for date in response.dates:
        for estimate in date.estimates:
            assert estimate.lower <= estimate.proportion <= estimate.upper
    assert any(estimate.lower < estimate.upper for date in response.dates for estimate in date.estimates)
    assert deconvolve(request) == response


def test_rounds_fitted_in_parts_give_the_same_result():
    request = mixture_request({"A": 0.5, "B": 0.5}, days=6, bootstraps=7, noise=0.05)
    parts = fit_rounds(request, 0, 3) + fit_rounds(request, 3, 1) + fit_rounds(request, 4, 3)

    assert aggregate(request, parts) == deconvolve(request)


def test_without_informative_mutations_there_are_no_dates():
    request = mixture_request({"A": 1})
    shared = DeconvolutionRequest(
        signatures={"A": ["C100T"], "B": ["C100T"]},
        frequencies=[f for f in request.frequencies if f.mutation == "C100T"],
    )

    assert deconvolve(shared).dates == []
    assert deconvolve(shared.model_copy(update={"frequencies": []})).dates == []


def test_gives_up_after_the_deadline():
    request = mixture_request({"A": 0.5, "B": 0.5}, days=6, bootstraps=7)

    with pytest.raises(DeadlineExceeded):
        fit_rounds(request, 0, 7, deadline=0)


def test_estimates_more_time_for_more_data():
    small = mixture_request({"A": 0.5, "B": 0.5}, days=10)
    longer = mixture_request({"A": 0.5, "B": 0.5}, days=40)
    wider = longer.model_copy(update={"options": longer.options.model_copy(update={"bandwidth": 100})})

    assert 0 < estimate_round_seconds(small) < estimate_round_seconds(longer) < estimate_round_seconds(wider)
