"""Durable work never edits canon; private leases fence every late completion."""

import hashlib
import json
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import Barrier, Event

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.commands import CommandError
from app.contracts import SCHEMA_ROOT
from app.main import create_app
from app.proposal_domain import build_context, prepare_proposal
from app.proposal_provider import MockProposalProvider
from app.repository import Repository
from tests.test_proposal_api import BRANCH, PROJECT, approval, request
from tests.test_stage_api import BASE, command

JOBS = BASE + "/jobs"
NOW = datetime(2026, 11, 13, tzinfo=UTC)


@pytest.mark.parametrize("tail, size, valid", [(2, 8176, True), (3, 8177, False)])
def test_job_request_byte_boundary_matches_client(tail, size, valid):
    from app.job_domain import validate_job_request
    value = {"requestId": "r", "expectedRevision": 0, "scopeIds": ["layer_kael"],
             "allowedOps": ["setLayerTransform"], "intent": "move_right",
             "message": "\0" * 1340 + "a" * tail}
    assert len(json.dumps(value, separators=(",", ":")).encode()) == size
    if valid:
        assert validate_job_request(value) == value
    else:
        with pytest.raises(CommandError):
            validate_job_request(value)


@pytest.mark.parametrize("case", json.loads(
    (SCHEMA_ROOT / "fixtures" / "job-cases.json").read_text(encoding="utf-8")),
    ids=lambda case: case["name"])
def test_shared_job_contract_cases(case):
    from app.job_domain import validate_job
    if case["valid"]:
        assert validate_job(case["value"]) == case["value"]
    else:
        with pytest.raises(CommandError):
            validate_job(case["value"])


def test_job_routes_enqueue_is_durable_idempotent_and_canon_free(tmp_path: Path):
    path = tmp_path / "jobs.sqlite3"
    payload = request()
    with TestClient(create_app(path)) as client:
        before = client.get(BASE + "/document").json()
        response = client.post(JOBS, json=payload)
        assert response.status_code == 200, response.text
        job = response.json()
        assert job["status"] == "queued" and job["attempt"] == 0
        assert job["request"] == payload and job["actualCost"] is None
        assert response.headers["cache-control"] == "no-store"
        assert client.post(JOBS, json=payload).json() == job
        assert client.post(JOBS, json={**payload, "message": "other"}).status_code == 409
        assert client.get(BASE + "/document").json() == before
        assert client.get(BASE + "/agent-proposals").json() == {"proposals": []}
        assert "token" not in json.dumps(job).lower()
    with TestClient(create_app(path)) as client:
        assert client.get(JOBS).json() == {"jobs": [job]}
        assert client.get(JOBS + "/" + job["jobId"]).json() == job


@pytest.fixture
def jobs(tmp_path: Path):
    from app.job_repository import JobRepository
    repository = Repository(tmp_path / "durable.sqlite3")
    repository.initialize()
    yield JobRepository(repository), repository
    repository.close()


def test_worker_stages_one_validated_proposal_and_only_approval_writes_canon(jobs):
    from app.job_worker import run_once
    queue, repository = jobs
    payload = request()
    before = repository.get(PROJECT, BRANCH)
    job = queue.enqueue(PROJECT, BRANCH, payload, now=NOW)
    context = build_context(before["document"], payload)
    expected = hashlib.sha256(json.dumps(context, sort_keys=True, ensure_ascii=False,
                                        separators=(",", ":")).encode()).hexdigest()
    assert job["inputHash"] == expected
    assert run_once(repository, now=NOW)
    assert not run_once(repository, now=NOW)
    job = queue.get(PROJECT, BRANCH, job["jobId"], now=NOW)
    assert job["status"] == "succeeded" and job["attempt"] == 1
    assert job["progress"] == 100 and job["actualCost"] == {"amount": 0, "currency": "USD"}
    proposal = queue.result(PROJECT, BRANCH, job["jobId"])
    assert job["result"]["proposalId"] == proposal["proposalId"]
    assert repository.get(PROJECT, BRANCH) == before
    assert len(repository.list_proposals(PROJECT, BRANCH)) == 1
    repository.execute(PROJECT, BRANCH, approval(proposal))
    assert repository.get(PROJECT, BRANCH)["document"]["project"]["revision"] == 1
    assert queue.result(PROJECT, BRANCH, job["jobId"])["status"] == "approved"
    assert queue.get(PROJECT, BRANCH, job["jobId"], now=NOW)["result"] == job["result"]


def test_result_reflects_rejection_without_rehashing_initial_artifact(jobs):
    from app.job_worker import run_once
    queue, repository = jobs
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    run_once(repository, now=NOW)
    before = queue.get(PROJECT, BRANCH, job["jobId"], now=NOW)
    proposal = queue.result(PROJECT, BRANCH, job["jobId"])
    repository.reject_proposal(PROJECT, BRANCH, proposal["proposalId"])
    assert queue.result(PROJECT, BRANCH, job["jobId"])["status"] == "rejected"
    assert queue.get(PROJECT, BRANCH, job["jobId"], now=NOW) == before


def test_expired_claim_retry_and_late_worker_are_fenced_across_restart(jobs):
    queue, repository = jobs
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    claim_a = queue.claim(now=NOW, lease_seconds=5)
    assert claim_a is not None
    assert queue.claim(now=NOW) is None
    draft = prepare_proposal(repository.get(PROJECT, BRANCH)["document"], job["request"],
                             MockProposalProvider())
    later = NOW + timedelta(seconds=5)
    from app.job_repository import JobRepository
    restarted = JobRepository(repository)
    recovered = restarted.get(PROJECT, BRANCH, job["jobId"], now=later)
    assert recovered["status"] == "failed" and recovered["error"]["retryable"]
    assert recovered["nextAttemptAt"] is None
    restarted.retry(PROJECT, BRANCH, job["jobId"], now=later)
    claim_b = restarted.claim(now=later)
    assert claim_b is not None and claim_b["job"]["attempt"] == 2
    assert queue.finish(claim_a, draft, now=later) is False
    assert restarted.finish(claim_b, draft, now=later)
    assert not queue.finish(claim_a, draft, now=later)
    assert len(repository.list_proposals(PROJECT, BRANCH)) == 1


@pytest.mark.parametrize("decision", ["cancel", "advance"])
def test_cancel_or_stale_base_discards_late_output(jobs, decision):
    queue, repository = jobs
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    claim = queue.claim(now=NOW)
    draft = prepare_proposal(repository.get(PROJECT, BRANCH)["document"], job["request"],
                             MockProposalProvider())
    if decision == "cancel":
        cancelled = queue.cancel(PROJECT, BRANCH, job["jobId"], now=NOW)
        assert queue.cancel(PROJECT, BRANCH, job["jobId"], now=NOW) == cancelled
    else:
        repository.execute(PROJECT, BRANCH, command(0, "setLayerTransform", "layer_kael", x=2))
    assert not queue.finish(claim, draft, now=NOW)
    final = queue.get(PROJECT, BRANCH, job["jobId"], now=NOW)
    assert final["status"] == ("cancelled" if decision == "cancel" else "stale")
    assert repository.list_proposals(PROJECT, BRANCH) == []
    with pytest.raises(CommandError):
        queue.retry(PROJECT, BRANCH, job["jobId"], now=NOW)


def test_transient_backoff_is_bounded_and_malformed_output_is_permanent(jobs):
    from app.job_worker import run_once
    queue, repository = jobs
    class Transient:
        name, model_version = "local_mock", "deterministic-demo-v1"
        def generate(self, context):
            raise TimeoutError("private provider details")
    repository.proposal_provider = Transient()
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    for attempt, seconds in [(1, 0), (2, 2), (3, 6)]:
        assert run_once(repository, now=NOW + timedelta(seconds=seconds))
        current = queue.get(PROJECT, BRANCH, job["jobId"], now=NOW + timedelta(seconds=seconds))
        assert current["attempt"] == attempt and current["status"] == "failed"
        assert current["error"]["retryable"] is (attempt < 3)
        assert "private" not in current["error"]["message"]
        assert not run_once(repository, now=NOW + timedelta(seconds=seconds))
    class Malformed(Transient):
        def generate(self, context):
            return '{"operations":[],"operations":[]}'
    repository.proposal_provider = Malformed()
    bad = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    assert run_once(repository, now=NOW)
    bad = queue.get(PROJECT, BRANCH, bad["jobId"], now=NOW)
    assert bad["error"]["retryable"] is False and bad["nextAttemptAt"] is None


def test_progress_never_decreases_and_terminal_claim_cannot_be_revived(jobs):
    queue, _ = jobs
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    claim = queue.claim(now=NOW)
    assert queue.progress(claim, 0.7, now=NOW)
    assert not queue.progress(claim, 0.2, now=NOW)
    queue.cancel(PROJECT, BRANCH, job["jobId"], now=NOW)
    assert not queue.progress(claim, 0.9, now=NOW)


@pytest.mark.parametrize("raw", ['{"__proto__":{}}', '{"requestId":"a","requestId":"b"}',
                                  '{"message":"\\ud800"}', '[' * 50 + '0' + ']' * 50])
def test_api_rejects_hostile_job_input(tmp_path: Path, raw):
    with TestClient(create_app(tmp_path / "hostile.sqlite3")) as client:
        response = client.post(JOBS, content=raw, headers={"Content-Type": "application/json"})
        assert response.status_code == 422
        assert client.get(JOBS).json() == {"jobs": []}


def test_result_insert_and_job_success_rollback_together(jobs):
    from sqlalchemy import event

    from app.persistence.tables import agent_proposals
    queue, repository = jobs
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    claim = queue.claim(now=NOW)
    draft = prepare_proposal(repository.get(PROJECT, BRANCH)["document"], job["request"],
                             MockProposalProvider())
    def fail(connection, cursor, statement, parameters, context, executemany):
        if statement.startswith("UPDATE jobs"):
            raise RuntimeError("injected after artifact insert")
    event.listen(repository.engine, "before_cursor_execute", fail)
    try:
        with pytest.raises(RuntimeError):
            queue.finish(claim, draft, now=NOW)
    finally:
        event.remove(repository.engine, "before_cursor_execute", fail)
    with repository.engine.connect() as connection:
        assert connection.execute(select(agent_proposals)).all() == []
    assert queue.get(PROJECT, BRANCH, job["jobId"], now=NOW)["status"] == "running"


def test_exclusive_claims_across_two_repository_connections(jobs):
    from app.job_repository import JobRepository
    queue, repository = jobs
    queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    other = Repository(repository.path)
    barrier = Barrier(2)
    def claim(which):
        barrier.wait(timeout=5)
        return JobRepository(which).claim(now=NOW)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(claim, [repository, other]))
        assert sum(result is not None for result in results) == 1
    finally:
        other.close()


@pytest.mark.parametrize("decision", ["cancel", "advance"])
def test_provider_releases_sqlite_lock_and_late_worker_stages_nothing(jobs, decision):
    from app.job_worker import run_once
    queue, repository = jobs
    started, release = Event(), Event()
    class Slow(MockProposalProvider):
        def generate(self, context):
            started.set()
            assert release.wait(timeout=10)
            return super().generate(context)
    repository.proposal_provider = Slow()
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(run_once, repository, now=NOW)
        try:
            assert started.wait(timeout=5)
            if decision == "cancel":
                queue.cancel(PROJECT, BRANCH, job["jobId"], now=NOW)
            else:
                repository.execute(PROJECT, BRANCH,
                                   command(0, "setLayerTransform", "layer_kael", x=2))
        finally:
            release.set()
        assert future.result(timeout=5)
    assert repository.list_proposals(PROJECT, BRANCH) == []
    final = queue.get(PROJECT, BRANCH, job["jobId"], now=NOW)
    assert final["status"] == ("cancelled" if decision == "cancel" else "stale")


def test_worker_reports_verified_phase_progress_before_provider_without_fake_ticks(jobs):
    from app.job_worker import run_once
    queue, repository = jobs
    class Observed(MockProposalProvider):
        def generate(self, context):
            running = queue.list(PROJECT, BRANCH, now=NOW)[0]
            assert running["status"] == "running" and running["progress"] == 25
            return super().generate(context)
    repository.proposal_provider = Observed()
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    run_once(repository, now=NOW)
    assert queue.get(PROJECT, BRANCH, job["jobId"], now=NOW)["progress"] == 100


def test_jobs_do_not_cross_branches_or_reuse_another_branch_request(jobs):
    queue, repository = jobs
    payload = request()
    job = queue.enqueue(PROJECT, BRANCH, payload, now=NOW)
    repository.fork_branch(PROJECT, {"commandId": "fork_job_test", "op": "forkBranch",
        "projectId": PROJECT, "sourceBranchId": BRANCH, "expectedRevision": 0,
        "newBranchId": "branch_child", "name": "Child", "actor": {"kind": "human", "id": "test"},
        "reason": "Test branch isolation"})
    assert queue.list(PROJECT, "branch_child", now=NOW) == []
    with pytest.raises(CommandError) as failure:
        queue.enqueue(PROJECT, "branch_child", payload, now=NOW)
    assert failure.value.status == 409
    for action in (queue.get, queue.cancel, queue.retry, queue.result):
        with pytest.raises(CommandError) as failure:
            action(PROJECT, "branch_child", job["jobId"])
        assert failure.value.status == 404


def test_three_expired_attempts_exhaust_explicit_retry_budget(jobs):
    queue, _ = jobs
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    for attempt in range(1, 4):
        clock = NOW + timedelta(seconds=attempt * 2)
        claim = queue.claim(now=clock, lease_seconds=1)
        assert claim["job"]["attempt"] == attempt
        final = queue.get(PROJECT, BRANCH, job["jobId"], now=clock + timedelta(seconds=1))
        assert final["error"]["retryable"] is (attempt < 3)
        if attempt < 3:
            queue.retry(PROJECT, BRANCH, job["jobId"], now=clock + timedelta(seconds=1))
        else:
            with pytest.raises(CommandError):
                queue.retry(PROJECT, BRANCH, job["jobId"], now=clock + timedelta(seconds=1))
    assert queue.claim(now=NOW + timedelta(seconds=20)) is None


def test_result_rejects_forged_artifact_or_live_proposal_content(jobs):
    from app.job_worker import run_once
    from app.persistence.tables import agent_proposals
    from app.persistence.tables import jobs as job_table
    queue, repository = jobs
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    run_once(repository, now=NOW)
    proposal = queue.result(PROJECT, BRANCH, job["jobId"])
    with repository.engine.begin() as connection:
        connection.execute(agent_proposals.update().values(
            record={**proposal, "message": "forged"}))
    with pytest.raises(CommandError):
        queue.result(PROJECT, BRANCH, job["jobId"])
    with repository.engine.begin() as connection:
        connection.execute(agent_proposals.update().values(record=proposal))
        connection.execute(job_table.update().values(artifact={**proposal, "message": "forged"}))
    with pytest.raises(CommandError):
        queue.result(PROJECT, BRANCH, job["jobId"])


def test_job_api_rejects_extra_query_nonjson_and_nonempty_decisions(tmp_path: Path):
    with TestClient(create_app(tmp_path / "resources.sqlite3")) as client:
        job = client.post(JOBS, json=request()).json()
        assert client.get(JOBS + "?extra=1").status_code == 422
        assert client.get(JOBS + "/" + job["jobId"] + "?revision=0").status_code == 422
        assert client.post(JOBS, content="{}", headers={
            "Content-Type": "text/plain"}).status_code == 422
        for operation in ("retry", "cancel"):
            response = client.post(JOBS + "/" + job["jobId"] + "/" + operation, json={"x": 1})
            assert response.status_code == 422
        assert client.post(JOBS + "/" + job["jobId"] + "/run", json={}).status_code == 404


def test_migration_from_0003_preserves_every_old_table_and_is_idempotent(jobs):
    queue, repository = jobs
    repository.execute(PROJECT, BRANCH, command(0, "setLayerTransform", "layer_kael", x=1))
    repository.create_proposal(PROJECT, BRANCH, request(revision=1))
    old_tables = ("branches", "snapshots", "commands", "agent_proposals", "branch_forks")
    with sqlite3.connect(repository.path) as connection:
        connection.execute("DROP TABLE jobs")
        connection.execute("UPDATE alembic_version SET version_num = '0003'")
        before = {table: connection.execute(f"SELECT * FROM {table}").fetchall()
                  for table in old_tables}
    repository.initialize()
    repository.initialize()
    with sqlite3.connect(repository.path) as connection:
        after = {table: connection.execute(f"SELECT * FROM {table}").fetchall()
                 for table in old_tables}
        assert before == after
        assert connection.execute("SELECT version_num FROM alembic_version").fetchone() == ("0004",)
    assert queue.list(PROJECT, BRANCH) == []


def test_sync_request_identity_cannot_collide_with_async_artifact_staging(jobs):
    from app.job_worker import run_once
    queue, repository = jobs
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    repository.create_proposal(PROJECT, BRANCH, request(requestId="job_result_" + job["jobId"]))
    run_once(repository, now=NOW)
    assert queue.get(PROJECT, BRANCH, job["jobId"], now=NOW)["status"] == "succeeded"
    assert len(repository.list_proposals(PROJECT, BRANCH)) == 2


@pytest.mark.parametrize("exhausted", [False, True], ids=["invalid-output", "attempt-exhausted"])
def test_cancel_preserves_permanent_failure_and_its_diagnostic(jobs, exhausted):
    queue, _ = jobs
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    clock = NOW
    for attempt in range(1, 4 if exhausted else 2):
        claim = queue.claim(now=clock)
        assert claim["job"]["attempt"] == attempt
        queue.fail(claim, transient=exhausted, now=clock)
        clock += timedelta(seconds=2 ** attempt)
    before = queue.get(PROJECT, BRANCH, job["jobId"], now=clock)
    assert before["status"] == "failed" and not before["error"]["retryable"]
    with pytest.raises(CommandError) as failure:
        queue.cancel(PROJECT, BRANCH, job["jobId"], now=clock)
    assert failure.value.status == 409
    assert queue.get(PROJECT, BRANCH, job["jobId"], now=clock) == before


@pytest.mark.parametrize("expired", [False, True], ids=["scheduled-backoff", "manual-lease-retry"])
def test_cancel_retryable_failure_is_allowed_and_idempotent(jobs, expired):
    queue, _ = jobs
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    claim = queue.claim(now=NOW, lease_seconds=1)
    if expired:
        clock = NOW + timedelta(seconds=1)
        queue.recover(now=clock)
    else:
        clock = NOW
        queue.fail(claim, transient=True, now=clock)
    before = queue.get(PROJECT, BRANCH, job["jobId"], now=clock)
    assert before["status"] == "failed" and before["error"]["retryable"]
    cancelled = queue.cancel(PROJECT, BRANCH, job["jobId"], now=clock)
    assert cancelled["status"] == "cancelled"
    assert cancelled["nextAttemptAt"] is None
    assert queue.cancel(PROJECT, BRANCH, job["jobId"], now=clock) == cancelled


def test_terminal_history_is_not_deserialized_by_scoped_reads_or_idle_worker(jobs, monkeypatch):
    from sqlalchemy import event

    from app import job_repository as module
    from app.persistence.tables import jobs as table
    queue, repository = jobs
    active = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    terminal = {**active, "status": "failed", "attempt": 1,
                "actualCost": {"amount": 0, "currency": "USD"},
                "error": {"code": "INVALID_PROVIDER_OUTPUT", "message": "Invalid",
                          "retryable": False}}
    rows = []
    for index in range(2001):
        record = {**terminal, "jobId": f"old_{index}",
                  "request": {**terminal["request"], "requestId": f"old_request_{index}"}}
        rows.append({"job_id": record["jobId"], "project_id": PROJECT, "branch_id": BRANCH,
                     "request_id": record["request"]["requestId"], "record": record,
                     "claim_token": None, "artifact": {"largeHistoricalArtifact": "x" * 4096}})
    with repository.engine.begin() as connection:
        connection.execute(table.insert(), rows)
    validated = []
    original = module.validate_job
    def observed(value):
        validated.append(value["jobId"])
        return original(value)
    statements = []
    def sql(connection, cursor, statement, parameters, context, executemany):
        if statement.lstrip().startswith("SELECT") and "FROM jobs" in statement:
            statements.append(statement)
    monkeypatch.setattr(module, "validate_job", observed)
    event.listen(repository.engine, "before_cursor_execute", sql)
    try:
        assert queue.get(PROJECT, BRANCH, active["jobId"], now=NOW)["status"] == "queued"
        assert len(validated) <= 4
        validated.clear()
        assert len(queue.list(PROJECT, BRANCH, now=NOW)) == 20
        assert len(validated) <= 24
        validated.clear()
        claim = queue.claim(now=NOW)
        assert claim is not None and len(validated) <= 4
        validated.clear()
        assert queue.claim(now=NOW) is None and len(validated) <= 2
        assert statements and all("jobs.artifact" not in statement for statement in statements)
    finally:
        event.remove(repository.engine, "before_cursor_execute", sql)


@pytest.mark.parametrize("location", ["contextNodes", "diff"])
def test_reserved_keys_in_generated_proposal_values_are_never_staged(jobs, location):
    queue, repository = jobs
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    claim = queue.claim(now=NOW)
    draft = prepare_proposal(repository.get(PROJECT, BRANCH)["document"], job["request"],
                             MockProposalProvider())
    if location == "contextNodes":
        draft["contextNodes"][0]["value"] = {"__proto__": {"polluted": True}}
    else:
        draft["diff"][0]["after"] = {"constructor": {"prototype": {"polluted": True}}}
    with pytest.raises(CommandError):
        queue.finish(claim, draft, now=NOW)
    assert repository.list_proposals(PROJECT, BRANCH) == []


@pytest.mark.parametrize("location", ["contextNodes", "diff"])
@pytest.mark.parametrize("artifact", [True, False], ids=["frozen-artifact", "current-proposal"])
def test_reserved_keys_in_stored_result_values_are_rejected(jobs, location, artifact):
    from app.job_domain import digest
    from app.job_worker import run_once
    from app.persistence.tables import agent_proposals
    from app.persistence.tables import jobs as table
    queue, repository = jobs
    job = queue.enqueue(PROJECT, BRANCH, request(), now=NOW)
    run_once(repository, now=NOW)
    final = queue.get(PROJECT, BRANCH, job["jobId"], now=NOW)
    proposal = queue.result(PROJECT, BRANCH, job["jobId"])
    if location == "contextNodes":
        proposal["contextNodes"][0]["value"] = {"__proto__": {"polluted": True}}
    else:
        proposal["diff"][0]["after"] = {"constructor": {"prototype": {"polluted": True}}}
    with repository.engine.begin() as connection:
        if artifact:
            # Keep the hash consistent so this tests the reserved-key boundary,
            # independently of the already-covered artifact corruption check.
            final["result"]["sha256"] = digest(proposal)
            connection.execute(table.update().values(record=final, artifact=proposal))
            connection.execute(agent_proposals.update().values(record=proposal))
        else:
            connection.execute(agent_proposals.update().values(record=proposal))
    with pytest.raises(CommandError):
        queue.result(PROJECT, BRANCH, job["jobId"])
