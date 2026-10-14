import pytest
from fastapi.testclient import TestClient

from lollipop_service.app import app

REQUEST = {
    "signatures": {"A": ["C100T", "G200A"], "B": ["C300T"]},
    "frequencies": [
        {"date": "2026-09-01", "mutation": "C100T", "frac": 0.7},
        {"date": "2026-09-01", "mutation": "G200A", "frac": 0.7},
        {"date": "2026-09-01", "mutation": "C300T", "frac": 0.3},
    ],
    "options": {"bandwidth": 10, "minTol": 0.001, "fScale": 0.01, "bootstraps": 3, "confidenceLevel": 0.95},
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as client:
        yield client


def test_deconvolve(client):
    response = client.post("/deconvolve", json=REQUEST)

    assert response.status_code == 200
    body = response.json()
    assert body["variants"] == ["A", "B", "undetermined"]
    assert [date["date"] for date in body["dates"]] == ["2026-09-01"]
    estimates = {estimate["variant"]: estimate for estimate in body["dates"][0]["estimates"]}
    assert estimates["A"]["proportion"] == pytest.approx(0.7, abs=0.01)
    assert set(estimates["A"]) == {"variant", "proportion", "lower", "upper"}


def test_repeated_requests_are_answered_from_the_cache(client):
    first = client.post("/deconvolve", json=REQUEST).json()
    runner = app.state.runner
    cached = len(runner.cache)

    assert client.post("/deconvolve", json=REQUEST).json() == first
    assert len(runner.cache) == cached


@pytest.mark.parametrize(
    "change",
    [
        {"signatures": {"A": ["C100T"]}},
        {"signatures": {"A": ["C100T"], "undetermined": ["C300T"]}},
        {"signatures": {"A": ["C100-"], "B": ["C300T"]}},
        {"frequencies": [{"date": "2026-09-01", "mutation": "C100T", "frac": 1.5}]},
        {"frequencies": [{"date": "1 Sept", "mutation": "C100T", "frac": 0.5}]},
        {"options": {**REQUEST["options"], "bootstraps": 0}},
    ],
)
def test_rejects_invalid_requests(client, change):
    assert client.post("/deconvolve", json={**REQUEST, **change}).status_code == 422


def test_rejects_too_many_bootstraps(client):
    request = {**REQUEST, "options": {**REQUEST["options"], "bootstraps": 100_000}}

    assert client.post("/deconvolve", json=request).status_code == 413


def test_allows_cross_origin_requests(client):
    response = client.post("/deconvolve", json=REQUEST, headers={"Origin": "https://example.org"})

    assert response.headers["access-control-allow-origin"] == "*"


def test_health_and_version(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/version").json() == {"lollipop": "0.5.3"}
