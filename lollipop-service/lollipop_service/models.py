"""The request and response of `POST /deconvolve`, in the camelCase of the dashboard."""

import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

UNDETERMINED = "undetermined"

# A nucleotide substitution like `C241T`, the only kind of mutation LolliPop's tally tables have.
Mutation = Annotated[str, Field(pattern=r"^[ACGT][1-9][0-9]*[ACGT]$")]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, allow_inf_nan=False)


class MutationFrequency(CamelModel):
    """The frequency of a mutation in the reads of one sample (or of the samples of one date)."""

    date: datetime.date
    mutation: Mutation
    frac: float = Field(ge=0, le=1)


class DeconvolutionOptions(CamelModel):
    """The settings of a LolliPop bootstrap preset; `DEFAULT_OPTIONS` is `deconv_bootstrap_cowwid`."""

    # The variance of the Gaussian kernel, in days².
    bandwidth: float = Field(gt=0)
    # Samples with a smaller kernel weight are left out of a date's fit.
    min_tol: float = Field(ge=0, lt=1)
    # The scale of the robust (soft L1) loss.
    f_scale: float = Field(gt=0)
    # Rounds of the bootstrap; a single round is a plain fit, without resampling.
    bootstraps: int = Field(ge=1)
    # Of the intervals, like 0.95.
    confidence_level: float = Field(gt=0, lt=1)


DEFAULT_OPTIONS = DeconvolutionOptions(bandwidth=10, min_tol=1e-3, f_scale=0.01, bootstraps=100, confidence_level=0.95)


class DeconvolutionRequest(CamelModel):
    # The mutations of each lineage of the panel; the order of the panel is the order of the result,
    # while the order of the mutations and frequencies doesn't matter.
    signatures: dict[str, list[Mutation]] = Field(min_length=2)
    frequencies: list[MutationFrequency]
    options: DeconvolutionOptions = DEFAULT_OPTIONS

    @field_validator("signatures")
    @classmethod
    def lineages_arent_columns(cls, signatures: dict[str, list[str]]) -> dict[str, list[str]]:
        # The lineages become columns of the tally table, next to these.
        reserved = {UNDETERMINED, "date", "pos", "base", "frac", "mutations", "resample_value"}
        if clashes := reserved & set(signatures):
            raise ValueError(f"these can't be names of lineages: {', '.join(sorted(clashes))}")
        # In a set order, like the frequencies: the same data is the same request, for the cache.
        return {lineage: sorted(set(mutations)) for lineage, mutations in signatures.items()}

    @field_validator("frequencies")
    @classmethod
    def sorted_frequencies(cls, frequencies: list[MutationFrequency]) -> list[MutationFrequency]:
        return sorted(frequencies, key=lambda f: (f.date, f.mutation, f.frac))


class Estimate(CamelModel):
    variant: str
    # The mean of the bootstrap rounds, and their quantiles for the confidence level.
    proportion: float
    lower: float
    upper: float


class DateEstimates(CamelModel):
    date: datetime.date
    # One per variant, in the order of `variants`.
    estimates: list[Estimate]


class DeconvolutionResponse(CamelModel):
    # The lineages of the panel, then `undetermined`.
    variants: list[str]
    # Every sampling date with an estimate, ascending.
    dates: list[DateEstimates]
