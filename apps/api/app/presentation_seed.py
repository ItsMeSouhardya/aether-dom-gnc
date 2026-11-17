"""Original local fixture setup through the normal validated command authority."""

import json
from pathlib import Path
from typing import Any

from app.contracts import load_fixture
from app.presentation_workspace import ROOT, inspect_database, safe_path
from app.repository import Repository


def prepare(root: Path, reviewed_job: bool = False) -> dict[str, Any]:
    safe_path(root)
    fixture = load_fixture()
    repository = Repository(root / "workspace.sqlite3", root)
    project, branch = fixture["project"]["id"], fixture["project"]["activeBranchId"]
    try:
        for asset in fixture["assets"]:
            source = safe_path(ROOT / asset["uri"])
            destination = safe_path(root / asset["uri"])
            destination.parent.mkdir(parents=True, exist_ok=True)
            with destination.open("xb") as handle:
                handle.write(source.read_bytes())
        repository.initialize()

        def execute(op: str, target: str, **args: Any) -> dict[str, Any]:
            revision = repository.get(project, branch)["document"]["project"]["revision"]
            return repository.execute(
                project,
                branch,
                {
                    "commandId": f"presentation_{revision}_{op}",
                    "projectId": project,
                    "branchId": branch,
                    "expectedRevision": revision,
                    "actor": {"kind": "human", "id": "presentation-preparation"},
                    "reason": "Explicit original local presentation preparation",
                    "op": op,
                    "targetId": target,
                    "args": args,
                },
            )

        rig = json.loads((ROOT / "assets/fixtures/kael-articulated.rig.json").read_text())
        mapping = {
            item["id"]: item["id"].replace("template_", "presentation_", 1)
            for item in [rig, *rig["bones"], *rig["attachments"]]
        }
        for item in [rig, *rig["bones"], *rig["attachments"]]:
            item["id"] = mapping[item["id"]]
            for key in ["parentId", "boneId"]:
                if item.get(key) is not None:
                    item[key] = mapping[item[key]]
        execute(
            "importRigLayer",
            "shot_rooftop",
            assetId="presentation_rig_asset",
            layerId="presentation_rig_layer",
            name="Original Kael-inspired rig",
            rights="project_original",
            characterId="char_kael",
            rig=rig,
            svg=(ROOT / "assets/fixtures/kael-articulated.svg").read_text(),
        )
        execute("setRigBonePose", "presentation_right", rotationDeg=-25, action=None)
        for index, (time, angle) in enumerate([(0, -25), (700, 65), (1400, -25)]):
            execute(
                "setRigBoneKeyframe",
                "presentation_right",
                keyframeId=f"presentation_frame_{index}",
                timeMs=time,
                rotationDeg=angle,
            )
        execute("setShotTension", "shot_rooftop", tension=0.7)
        doc = repository.get(project, branch)["document"]
        layer = next(item for item in doc["layers"] if item["id"] == "presentation_rig_layer")
        execute(
            "setShotLayoutOverride",
            "shot_rooftop",
            aspectRatio="9:16",
            layerTransforms={
                layer["id"]: {**layer["transform"], "x": 0, "y": 0, "scale": 1},
            },
        )
        for index, (kind, target, label) in enumerate(
            [
                ("character", "char_kael", "Kael — saved character lore"),
                ("event", "event_injury", "Left-arm injury — saved continuity"),
            ]
        ):
            execute(
                "setLoreHotspot",
                "shot_rooftop",
                hotspot={
                    "id": f"presentation_hotspot_{index}",
                    "label": label,
                    "targetKind": kind,
                    "targetId": target,
                    "positions": {
                        "16:9": {"x": 0.25 + index * 0.5, "y": 0.3},
                        "9:16": {"x": 0.2 + index * 0.6, "y": 0.25},
                    },
                },
            )
        statement = (
            (ROOT / "assets/fixtures/README.md").read_text(encoding="utf-8")
            + "\n\n"
            + (ROOT / "assets/fixtures/kael-articulated.provenance.md").read_text(encoding="utf-8")
        )
        for asset in repository.get(project, branch)["document"]["assets"]:
            execute(
                "setAssetEvidence",
                asset["id"],
                rights="project_original",
                expectedAssetUri=asset["uri"],
                expectedSourceUri=asset.get("sourceUri", asset["uri"]),
                creator="AETHER-DOM project original fixture authors",
                source="Checked-in assets/fixtures original drawing and synthesis source",
                license="Recorded fixture redistribution permission; attached source evidence",
                attribution="AETHER-DOM original fixtures and Kael-inspired articulated drawing",
                permissions={
                    "private_preview": "allowed",
                    "public_distribution": "allowed",
                    "commercial_pack": "unknown",
                },
                lineage=None,
                consents=[
                    {
                        "kind": kind,
                        "applicability": "not_applicable",
                        "subject": "",
                        "status": "unknown",
                        "uses": [],
                        "evidenceHashes": [],
                    }
                    for kind in ["voice", "likeness"]
                ],
                evidence=[{"label": "Original checked-in fixture provenance", "text": statement}],
            )
        job_id = None
        if reviewed_job:
            from app.job_repository import JobRepository
            from app.job_worker import run_once

            queue = JobRepository(repository)
            revision = repository.get(project, branch)["document"]["project"]["revision"]
            job = queue.enqueue(
                project,
                branch,
                {
                    "requestId": "presentation_mock",
                    "expectedRevision": revision,
                    "scopeIds": ["layer_kael"],
                    "allowedOps": ["setLayerPose"],
                    "intent": "repair_pose",
                    "message": "Explicit zero-cost deterministic fixture mock review",
                },
            )
            run_once(repository)
            proposal = queue.result(project, branch, job["jobId"])
            execute("approveProposal", proposal["proposalId"])
            job_id = job["jobId"]
        doc = repository.get(project, branch)["document"]
        repository.fork_branch(
            project,
            {
                "commandId": "presentation_fork",
                "op": "forkBranch",
                "projectId": project,
                "sourceBranchId": branch,
                "expectedRevision": doc["project"]["revision"],
                "newBranchId": "branch_presentation_fork",
                "name": "Presentation alternate",
                "actor": {"kind": "human", "id": "presentation-preparation"},
                "reason": "Preserve isolated original presentation starting point",
            },
        )
        manifest = repository.get_player_manifest(project, branch, export_use="public_distribution")
        if not manifest:
            raise RuntimeError("Public presentation manifest unavailable")
        return {
            "projectId": project,
            "branchId": branch,
            "initialRevision": doc["project"]["revision"],
            "reviewedMockJobId": job_id,
            "provider": "deterministic mock only; zero cost",
            "initialInspection": inspect_database(root / "workspace.sqlite3", root),
        }
    finally:
        repository.close()
