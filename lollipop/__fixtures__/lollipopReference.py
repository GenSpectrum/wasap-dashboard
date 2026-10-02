# SPDX-License-Identifier: GPL-3.0-or-later

"""
Writes `lollipopReference.json`, the fixture `kernelDeconvolution.spec.ts` checks the TypeScript port
against: real W-ASAP data for one location, deconvolved by LolliPop itself with its bootstrap
(`deconv_bootstrap_cowwid` preset, fewer rounds). Which mutations each round drew is written to the
fixture as well, so that the port can replay the same draws.

Needs numpy, scipy and pandas, and a LolliPop checkout on the PYTHONPATH:

    PYTHONPATH=path/to/LolliPop python lollipopReference.py

The signatures come from GenSpectrum's pango-lineage collections and the mutation frequencies from
SILO, the same way the dashboard gets them. A random subset of the mutations and samples is kept,
so the fixture stays small.
"""

import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd
from lollipop import DataPreprocesser, GaussianKernel, KernelDeconv, RobustReg
from lollipop.confints import NullConfint

PANEL = ["XFG", "NB.1.8.1", "LP.8.1", "XEC"]
LOCATION = "Zürich (ZH)"
DATE_FROM, DATE_TO = "2026-04-01", "2026-08-31"
MIN_COVERAGE = 20
MUTATION_SAMPLE_SIZE = 40
OPTIONS = {"bandwidth": 10, "minTol": 1e-3, "fScale": 0.01, "bootstraps": 20, "confidenceLevel": 0.95}

COLLECTIONS_URL = "https://genspectrum.org/api/collections"
SILO_URL = "https://silo.wasap.genspectrum.org/covid/query"


def get_json(url):
    with urllib.request.urlopen(url) as response:
        return json.load(response)


def signature(lineage):
    summaries = get_json(f"{COLLECTIONS_URL}?userId=3&organism=covid&tags=pango-lineage")
    collection_id = next(c["id"] for c in summaries if c["name"] == lineage)
    collection = get_json(f"{COLLECTIONS_URL}/{collection_id}")
    variant = next(v for v in collection["variants"] if v["name"] == "Nucleotide substitutions")
    return [m for m in variant["filterObject"]["nucleotideMutations"] if re.fullmatch(r"[ACGT]\d+[ACGT]", m)]


def symbols_by_sample(position):
    query = (
        f"default.filter(locationName = '{LOCATION}' && date >= '{DATE_FROM}' && date <= '{DATE_TO}')"
        f".map({{sym := main.at({position})}}).groupBy({{count := count()}}, {{sampleId, date, sym}})"
    )
    request = urllib.request.Request(SILO_URL, data=query.encode(), headers={"Content-Type": "text/plain"})
    with urllib.request.urlopen(request) as response:
        return [json.loads(line) for line in response.read().decode().splitlines() if line]


def main():
    rng = np.random.default_rng(1)
    signatures = {lineage: signature(lineage) for lineage in PANEL}
    mutations = sorted({m for s in signatures.values() for m in s}, key=lambda m: int(m[1:-1]))
    # Only informative mutations are worth keeping in the fixture: not carried by every lineage.
    informative = [m for m in mutations if sum(m in s for s in signatures.values()) < len(PANEL)]
    kept = sorted(rng.choice(informative, MUTATION_SAMPLE_SIZE, replace=False), key=lambda m: int(m[1:-1]))
    signatures = {lineage: [m for m in s if m in kept] for lineage, s in signatures.items()}

    positions = sorted({int(m[1:-1]) for m in kept})
    with ThreadPoolExecutor(16) as executor:
        rows_by_position = dict(zip(positions, executor.map(symbols_by_sample, positions)))

    frequencies = []
    for mutation in kept:
        position, base = int(mutation[1:-1]), mutation[-1]
        counts = {}
        for row in rows_by_position[position]:
            sample = counts.setdefault((row["sampleId"], row["date"]), {})
            sample[row["sym"]] = row["count"]
        for (sample_id, date), symbols in sorted(counts.items()):
            coverage = sum(symbols.get(s, 0) for s in "ACGT-")
            if coverage >= MIN_COVERAGE:
                frac = symbols.get(base, 0) / coverage
                frequencies.append({"sampleId": sample_id, "date": date, "mutation": mutation, "frac": frac})

    tally = pd.DataFrame(
        [
            {
                "date": o["date"],
                "pos": int(o["mutation"][1:-1]),
                "base": o["mutation"][-1],
                "frac": o["frac"],
                **{lineage: "mut" if o["mutation"] in signatures[lineage] else np.nan for lineage in PANEL},
            }
            for o in frequencies
        ]
    )
    preprocessed = DataPreprocesser(tally).general_preprocess(
        variants_list=PANEL, variants_pangolin={}, variants_not_reported=[], to_drop=["subset", "revert"]
    )
    data = preprocessed.df_tally
    data_mutations = sorted(set(data.loc[data["undetermined"] == 0, "mutations"]), key=lambda m: int(m[:-1]))
    code = {f"{int(m[1:-1])}{m[-1]}": m for m in kept}

    # LolliPop's `resample_mutations`: draw as many mutations as there are, with replacement; a
    # mutation and its complement row are weighted by how often the mutation was drawn.
    resamples = []
    fits = []
    for _ in range(OPTIONS["bootstraps"]):
        counts = np.bincount(rng.integers(0, len(data_mutations), len(data_mutations)), minlength=len(data_mutations))
        weight_by_mutation = dict(zip(data_mutations, counts))
        weights = data["mutations"].str.lstrip("-").map(weight_by_mutation)
        resamples.append({code[m]: int(c) for m, c in weight_by_mutation.items()})
        fit = KernelDeconv(
            data[PANEL + ["undetermined"]],
            data["frac"],
            data["date"],
            weights=weights,
            kernel=GaussianKernel(bandwidth=OPTIONS["bandwidth"]),
            reg=RobustReg(f_scale=OPTIONS["fScale"]),
            confint=NullConfint(),
        ).deconv_all(min_tol=OPTIONS["minTol"])
        fits.append(fit.fitted)

    level = OPTIONS["confidenceLevel"]
    expected = [
        {
            "date": date.strftime("%Y-%m-%d"),
            "variant": variant,
            "proportion": np.mean([fit.loc[date, variant] for fit in fits]),
            "lower": np.quantile([fit.loc[date, variant] for fit in fits], (1 - level) / 2),
            "upper": np.quantile([fit.loc[date, variant] for fit in fits], 1 - (1 - level) / 2),
        }
        for date in sorted(fits[0].index)
        for variant in PANEL + ["undetermined"]
    ]

    fixture = {
        "options": OPTIONS,
        "signatures": signatures,
        "frequencies": frequencies,
        "resamples": resamples,
        "expected": expected,
    }
    Path(__file__).with_suffix(".json").write_text(json.dumps(fixture, indent=1, default=float) + "\n")


if __name__ == "__main__":
    main()
