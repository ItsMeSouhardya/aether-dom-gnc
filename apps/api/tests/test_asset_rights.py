"""Rights must bind to exact versions and portable evidence without changing canon."""

import copy
import json

import pytest

from app.asset_rights import (
    evaluate_asset_use,
    svg_payload_hash,
    validate_asset_provenance,
    validate_evidence_args,
)
from app.contracts import SCHEMA_ROOT, load_fixture, validate_document

CASES = json.loads(
    (SCHEMA_ROOT / "fixtures" / "asset-rights-cases.json").read_text(encoding="utf-8")
)


def test_document_04_accepts_optional_asset_provenance():
    document = load_fixture()
    document["schemaVersion"] = "0.4.0"
    document["assets"][0]["provenance"] = CASES["provenance"]
    assert validate_document(document) == []


@pytest.mark.parametrize("case", CASES["cases"], ids=lambda case: case["name"])
def test_shared_policy_cases(case):
    before = copy.deepcopy(case)
    decision = evaluate_asset_use(case["asset"], case["use"], case["evidence"])
    assert decision["allowed"] is case["allowed"]
    assert decision["assetId"] == "asset_1"
    assert decision["use"] == case["use"]
    assert bool(decision["reasons"]) is not case["allowed"]
    assert case == before
    if case["allowed"] and "provenance" in case["asset"]:
        assert decision["attribution"] == ["Art by Ada"]


def test_svg_payload_hash_cross_language():
    assert svg_payload_hash(CASES["svg"]) == CASES["svgPayloadSha256"]
    svg = copy.deepcopy(CASES["svg"])
    svg["root"]["attributes"] = dict(reversed(list(svg["root"]["attributes"].items())))
    assert svg_payload_hash(svg) == CASES["svgPayloadSha256"]
    svg["viewBox"]["x"] = 1
    assert svg_payload_hash(svg) != CASES["svgPayloadSha256"]


def test_svg_payload_hash_survives_javascript_json_roundtrip():
    # JSON.stringify emits 0 for -0; reproduce that wire token without a Node dependency.
    wire = json.dumps(CASES["svg"])
    assert '"x": -0.0' in wire
    portable = json.loads(wire.replace('"x": -0.0', '"x": 0'))
    assert svg_payload_hash(portable) == svg_payload_hash(CASES["svg"])


def test_old_documents_reject_provenance_and_new_documents_reject_duplicate_records():
    for version in ["0.1.0", "0.2.0", "0.3.0"]:
        document = load_fixture()
        document["schemaVersion"] = version
        document["assets"][0]["provenance"] = CASES["provenance"]
        assert validate_document(document)
    for case in CASES["cases"]:
        if case["name"] in [
            "duplicate evidence references",
            "unsafe path",
            "duplicate consent kinds",
        ]:
            document = load_fixture()
            document["schemaVersion"] = "0.4.0"
            document["assets"][0]["provenance"] = case["asset"]["provenance"]
            assert validate_document(document)


def test_portable_bounds_and_cycles():
    ledger = copy.deepcopy(CASES["provenance"])
    ledger["creator"] = "😀" * 2001
    assert validate_asset_provenance(ledger)
    ledger["creator"] = "\ud800"
    assert validate_asset_provenance(ledger)
    cyclic = {}
    cyclic["self"] = cyclic
    assert validate_asset_provenance(cyclic)
    args = {
        key: copy.deepcopy(CASES["provenance"][key])
        for key in [
            "creator",
            "source",
            "license",
            "attribution",
            "permissions",
            "lineage",
            "consents",
        ]
    }
    args.update(
        rights="project_original",
        expectedAssetUri=CASES["asset"]["uri"],
        expectedSourceUri=CASES["asset"]["sourceUri"],
        evidence=[{"label": "Statement", "text": CASES["blob"]["text"]}],
    )
    assert validate_evidence_args(args) == []
    args["evidence"][0]["text"] = "😀" * 16385
    assert validate_evidence_args(args)
    args["evidence"][0]["text"] = CASES["blob"]["text"]
    args["evidence"].append(copy.deepcopy(args["evidence"][0]))
    assert validate_evidence_args(args)


def test_exact_utf8_and_total_evidence_bounds_and_unicode_whitespace():
    args = {
        key: copy.deepcopy(CASES["provenance"][key])
        for key in [
            "creator",
            "source",
            "license",
            "attribution",
            "permissions",
            "lineage",
            "consents",
        ]
    }
    args.update(
        rights="project_original",
        expectedAssetUri=CASES["asset"]["uri"],
        expectedSourceUri=CASES["asset"]["sourceUri"],
        evidence=[{"label": "Text", "text": "😀" * 16384}],
    )
    assert validate_evidence_args(args) == []
    args["evidence"] = [{"label": "Text", "text": str(i) + "x" * 65535} for i in range(4)]
    assert validate_evidence_args(args) == []
    args["evidence"].append({"label": "Fifth", "text": "x"})
    assert validate_evidence_args(args)
    args["evidence"] = [{"label": "\u0085", "text": "Statement"}]
    assert validate_evidence_args(args)
    ledger = copy.deepcopy(CASES["provenance"])
    ledger["creator"] = "\u0085"
    assert (
        evaluate_asset_use(
            {**CASES["asset"], "provenance": ledger}, "public_distribution", [CASES["blob"]]
        )["allowed"]
        is False
    )


def test_svg_payload_rejects_non_scalar_text():
    svg = copy.deepcopy(CASES["svg"])
    svg["root"]["text"] = "\ud800"
    with pytest.raises(ValueError):
        svg_payload_hash(svg)


def test_final_newline_and_traversal_media_identities():
    for uri in ["assets/current.svg\n", "assets/../secret.svg", "assets//current.svg"]:
        ledger = copy.deepcopy(CASES["provenance"])
        ledger["current"]["uri"] = uri
        assert validate_asset_provenance(ledger)
