import copy
import json
import math
from pathlib import Path
from typing import Any

import pytest

from app.contracts import load_fixture, validate_document

SCHEMA_ROOT = Path(__file__).resolve().parents[3] / "packages" / "schema"
CASES = json.loads((SCHEMA_ROOT / "fixtures" / "invalid-cases.json").read_text())


def test_supplied_fixture_validates_without_mutation() -> None:
    document = load_fixture()
    before = copy.deepcopy(document)
    assert validate_document(document) == []
    assert document == before
    assert document["layers"][1]["pose"] == "lifting_with_left_arm"


@pytest.mark.parametrize("case", CASES, ids=[case["name"] for case in CASES])
def test_rejects_shared_invalid_cases(case: dict[str, Any]) -> None:
    document = load_fixture()
    parent = document
    for key in case["path"][:-1]:
        parent = parent[key]
    if case.get("remove"):
        del parent[case["path"][-1]]
    else:
        parent[case["path"][-1]] = case["value"]
    before = copy.deepcopy(document)
    issues = validate_document(document)
    assert issues
    assert all(isinstance(issue["path"], str) and issue["message"] for issue in issues)
    assert document == before


@pytest.mark.parametrize("value", [None, [], "document", 0])
def test_rejects_non_documents(value: object) -> None:
    assert validate_document(value)


def test_independent_fixture_loads() -> None:
    first = load_fixture()
    first["project"]["title"] = "Changed"
    assert load_fixture()["project"]["title"] == "Neon Shogun — Rooftop"


@pytest.mark.parametrize("value", [float("nan"), float("inf"), -float("inf"), json.loads("1e400")])
def test_rejects_non_finite_authored_coordinates(value: float) -> None:
    document = load_fixture()
    document["layers"][0]["transform"]["x"] = value
    assert validate_document(document)
    current = document["layers"][0]["transform"]["x"]
    assert math.isnan(current) if math.isnan(value) else current == value
