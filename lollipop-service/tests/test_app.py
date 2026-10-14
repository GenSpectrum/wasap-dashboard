import os
import signal
import time
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from lollipop_service import app as service
from lollipop_service.app import _split, app

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


def test_the_order_of_frequencies_and_mutations_doesnt_matter(client):
    client.post("/deconvolve", json=REQUEST)
    cached = len(app.state.runner.cache)
    shuffled = {
        **REQUEST,
        "signatures": {"A": ["G200A", "C100T"], "B": ["C300T"]},
        "frequencies": REQUEST["frequencies"][::-1],
    }

    client.post("/deconvolve", json=shuffled)

    assert len(app.state.runner.cache) == cached


def test_rejects_too_many_bootstraps(client):
    request = {**REQUEST, "options": {**REQUEST["options"], "bootstraps": 100_000}}

    assert client.post("/deconvolve", json=request).status_code == 413


def test_rejects_large_bodies_before_reading_them(client, monkeypatch):
    monkeypatch.setattr(service, "MAX_BODY_BYTES", 100)

    assert client.post("/deconvolve", json=REQUEST).status_code == 413
    assert client.post("/deconvolve", content=b"{}", headers={"Content-Length": ""}).status_code == 411


def with_date(date):
    return {**REQUEST, "frequencies": [{**f, "date": date} for f in REQUEST["frequencies"]]}


def kill_a_process(pool):
    os.kill(next(iter(pool._processes)), signal.SIGKILL)


def test_replaces_the_pool_when_a_process_died(client):
    pool = app.state.runner.pool
    kill_a_process(pool)
    while not pool._broken:
        time.sleep(0.01)

    assert client.post("/deconvolve", json=with_date("2026-08-01")).status_code == 200
    assert app.state.runner.pool is not pool


def test_retries_when_a_process_dies_during_a_deconvolution(client):
    pool = app.state.runner.pool
    request = {**with_date("2026-08-02"), "options": {**REQUEST["options"], "bootstraps": 200}}
    with ThreadPoolExecutor(1) as thread:
        response = thread.submit(client.post, "/deconvolve", json=request)
        time.sleep(0.2)
        kill_a_process(pool)

        assert response.result().status_code == 200
    assert app.state.runner.pool is not pool


def test_gives_up_on_deconvolutions_that_take_too_long(client, monkeypatch):
    pool = app.state.runner.pool
    monkeypatch.setattr(service, "TIMEOUT", 0.01)

    assert client.post("/deconvolve", json=with_date("2026-09-03")).status_code == 503
    assert app.state.runner.pool is not pool

    monkeypatch.undo()
    assert client.post("/deconvolve", json=with_date("2026-09-04")).status_code == 200


def test_allows_cross_origin_requests(client):
    response = client.post("/deconvolve", json=REQUEST, headers={"Origin": "https://example.org"})

    assert response.headers["access-control-allow-origin"] == "*"


def test_health_and_version(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/version").json() == {"lollipop": "0.5.3"}


def test_split():
    assert _split(10, 3) == [(0, 4), (4, 3), (7, 3)]
    assert _split(2, 4) == [(0, 1), (1, 1)]
