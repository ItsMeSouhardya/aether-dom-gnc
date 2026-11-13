"""Durable job transactions, private claim fencing and atomic proposal publication."""

from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

from sqlalchemy import Connection, RowMapping, and_, or_, select

from app.commands import CommandError
from app.job_domain import (
    ROUTE_ID,
    ZERO_COST,
    digest,
    instant,
    invalid,
    portable,
    stamp,
    validate_job,
    validate_job_request,
)
from app.persistence.tables import agent_proposals, jobs
from app.proposal_domain import apply_proposal, build_context, validate_proposal_record
from app.repository import Repository


class JobRepository:
    def __init__(self, repository: Repository) -> None:
        self.repository = repository

    @staticmethod
    def _ids(*values: str) -> None:
        if any(not ROUTE_ID.fullmatch(value) for value in values):
            raise invalid("Invalid job resource identity")

    def _row(self, connection: Connection, project: str, branch: str, job_id: str, *,
             artifact: bool = False) -> RowMapping:
        self._ids(project, branch, job_id)
        self.repository._branch(connection, project, branch)
        columns = [jobs.c.record, jobs.c.claim_token]
        if artifact:
            columns.append(jobs.c.artifact)
        row = connection.execute(select(*columns).where(
            jobs.c.job_id == job_id, jobs.c.project_id == project, jobs.c.branch_id == branch,
        )).mappings().first()
        if row is None:
            raise CommandError(404, "JOB_NOT_FOUND", "The job does not exist in this branch")
        return row

    @staticmethod
    def _write(connection: Connection, record: dict[str, Any], token: str | None = None,
               artifact: dict[str, Any] | None = None) -> dict[str, Any]:
        record = validate_job(record)
        values: dict[str, Any] = {"record": record, "claim_token": token}
        if artifact is not None:
            values["artifact"] = artifact
        connection.execute(jobs.update().where(jobs.c.job_id == record["jobId"]).values(**values))
        return record

    def enqueue(self, project: str, branch: str, value: object, *,
                now: datetime | None = None) -> dict[str, Any]:
        self._ids(project, branch)
        request = validate_job_request(value)
        time = instant(now)
        with self.repository.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            head = self.repository._branch(connection, project, branch)
            previous = connection.execute(select(jobs).where(
                jobs.c.request_id == request["requestId"],
            )).mappings().first()
            if previous is not None:
                record = validate_job(previous["record"])
                if (record["projectId"] != project or record["branchId"] != branch
                        or record["request"] != request):
                    raise CommandError(409, "REQUEST_ID_REUSED",
                                       "Request ID already belongs to another job request")
                return record
            self.repository._check_proposal_revision(request["expectedRevision"], head["revision"])
            document = self.repository._snapshot(connection, head)["document"]
            context = build_context(document, request)
            portable(context, 65536)
            provider = self.repository.proposal_provider
            record = validate_job({
                "jobId": "job_" + uuid4().hex, "projectId": project, "branchId": branch,
                "baseRevision": request["expectedRevision"], "request": request,
                "inputHash": digest(context), "provider": provider.name,
                "modelVersion": provider.model_version, "estimatedCost": ZERO_COST,
                "actualCost": None, "status": "queued", "attempt": 0, "maxAttempts": 3,
                "progress": 0, "createdAt": stamp(time), "updatedAt": stamp(time),
                "leaseExpiresAt": None, "nextAttemptAt": None, "error": None, "result": None,
            })
            connection.execute(jobs.insert().values(
                job_id=record["jobId"], project_id=project, branch_id=branch,
                request_id=request["requestId"], record=record, claim_token=None, artifact=None,
            ))
            connection.commit()
            return record

    def _recover(self, connection: Connection, time: datetime, *, project: str | None = None,
                 branch: str | None = None, job_id: str | None = None) -> None:
        # The write transaction serializes recovery, claim, cancellation and completion.
        status = jobs.c.record["status"].as_string()
        query = select(jobs.c.record).where(or_(
            status.in_(["queued", "running"]),
            and_(status == "failed", jobs.c.record["error"]["retryable"].as_boolean().is_(True)),
        ))
        if project is not None:
            query = query.where(jobs.c.project_id == project)
        if branch is not None:
            query = query.where(jobs.c.branch_id == branch)
        if job_id is not None:
            query = query.where(jobs.c.job_id == job_id)
        for value in connection.execute(query).scalars().all():
            record = validate_job(value)
            head = self.repository._branch(connection, record["projectId"], record["branchId"])
            if head["revision"] != record["baseRevision"]:
                self._terminal(connection, record, "stale", "STALE_BASE",
                               "The branch advanced; enqueue a new job against current canon", time)
            elif (record["status"] == "running"
                  and datetime.fromisoformat(record["leaseExpiresAt"]) <= time):
                self._write(connection, {**record, "status": "failed", "updatedAt": stamp(time),
                    "leaseExpiresAt": None, "nextAttemptAt": None, "actualCost": ZERO_COST,
                    "error": {"code": "LEASE_EXPIRED", "message": "Worker lease expired",
                              "retryable": record["attempt"] < record["maxAttempts"]}})

    def recover(self, *, now: datetime | None = None) -> None:
        with self.repository.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            self._recover(connection, instant(now))
            connection.commit()

    def get(self, project: str, branch: str, job_id: str, *,
            now: datetime | None = None) -> dict[str, Any]:
        with self.repository.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            self._row(connection, project, branch, job_id)
            self._recover(connection, instant(now), project=project, branch=branch, job_id=job_id)
            record = validate_job(self._row(connection, project, branch, job_id)["record"])
            connection.commit()
            return record

    def list(self, project: str, branch: str, *,
             now: datetime | None = None) -> list[dict[str, Any]]:
        self._ids(project, branch)
        with self.repository.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            self.repository._branch(connection, project, branch)
            self._recover(connection, instant(now), project=project, branch=branch)
            records = connection.execute(select(jobs.c.record).where(
                jobs.c.project_id == project, jobs.c.branch_id == branch,
            ).order_by(jobs.c.record["createdAt"].as_string().desc(),
                       jobs.c.job_id.desc()).limit(20)).scalars().all()
            result = [validate_job(record) for record in records]
            connection.commit()
            return result

    def _terminal(self, connection: Connection, record: dict[str, Any], status: str,
                  code: str, message: str, time: datetime) -> dict[str, Any]:
        return self._write(connection, {**record, "status": status, "updatedAt": stamp(time),
            "leaseExpiresAt": None, "nextAttemptAt": None,
            "actualCost": ZERO_COST if record["attempt"] else None,
            "error": {"code": code, "message": message, "retryable": False}})

    def cancel(self, project: str, branch: str, job_id: str, *,
               now: datetime | None = None) -> dict[str, Any]:
        with self.repository.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            time = instant(now)
            self._row(connection, project, branch, job_id)
            self._recover(connection, time, project=project, branch=branch, job_id=job_id)
            record = validate_job(self._row(connection, project, branch, job_id)["record"])
            if record["status"] == "cancelled":
                return record
            if (record["status"] in {"succeeded", "stale"}
                    or (record["status"] == "failed" and not record["error"]["retryable"])):
                raise CommandError(409, "JOB_TERMINAL", "The job is already terminal")
            result = self._terminal(connection, record, "cancelled", "CANCELLED",
                                    "Cancelled by the creator", time)
            connection.commit()
            return result

    def retry(self, project: str, branch: str, job_id: str, *,
              now: datetime | None = None) -> dict[str, Any]:
        with self.repository.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            time = instant(now)
            self._row(connection, project, branch, job_id)
            self._recover(connection, time, project=project, branch=branch, job_id=job_id)
            record = validate_job(self._row(connection, project, branch, job_id)["record"])
            if record["status"] in {"queued", "running"}:
                connection.commit()
                return record
            if record["status"] != "failed" or not record["error"]["retryable"]:
                connection.commit()
                raise CommandError(409, "JOB_NOT_RETRYABLE", "The job cannot be retried")
            result = self._write(connection, {**record, "status": "queued", "error": None,
                "updatedAt": stamp(time), "nextAttemptAt": None, "actualCost": None})
            connection.commit()
            return result

    def claim(self, *, now: datetime | None = None,
              lease_seconds: int = 30) -> dict[str, Any] | None:
        if not 1 <= lease_seconds <= 300:
            raise ValueError("Lease must be between one and 300 seconds")
        time = instant(now)
        with self.repository.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            self._recover(connection, time)
            status = jobs.c.record["status"].as_string()
            next_at = jobs.c.record["nextAttemptAt"].as_string()
            rows = connection.execute(select(jobs.c.record).where(or_(
                status == "queued",
                and_(status == "failed",
                     jobs.c.record["error"]["retryable"].as_boolean().is_(True),
                     next_at.is_not(None), next_at <= stamp(time)),
            )).order_by(
                jobs.c.record["createdAt"].as_string(), jobs.c.job_id,
            ).limit(1)).scalars().all()
            for value in rows:
                record = validate_job(value)
                token = uuid4().hex
                record = self._write(connection, {**record, "status": "running",
                    "attempt": record["attempt"] + 1, "error": None, "actualCost": None,
                    "updatedAt": stamp(time), "nextAttemptAt": None,
                    "leaseExpiresAt": stamp(time + timedelta(seconds=lease_seconds))}, token)
                connection.commit()
                return {"job": record, "token": token}
            connection.commit()
            return None

    def _fenced(self, connection: Connection, claim: dict[str, Any],
                time: datetime) -> dict[str, Any] | None:
        submitted = claim["job"]
        row = self._row(connection, submitted["projectId"], submitted["branchId"],
                        submitted["jobId"])
        record = validate_job(row["record"])
        if (record["status"] != "running" or row["claim_token"] != claim["token"]
                or record["attempt"] != submitted["attempt"]):
            return None
        # Recovery persists stale/expired status before any completion is considered.
        self._recover(connection, time, project=record["projectId"], branch=record["branchId"],
                      job_id=record["jobId"])
        row = self._row(connection, record["projectId"], record["branchId"], record["jobId"])
        return validate_job(row["record"]) if row["record"]["status"] == "running" else None

    def progress(self, claim: dict[str, Any], progress: float, *,
                 now: datetime | None = None) -> bool:
        if not 0 <= progress < 100:
            return False
        with self.repository.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            time = instant(now)
            record = self._fenced(connection, claim, time)
            if record is None or progress < record["progress"]:
                connection.commit()
                return False
            self._write(connection, {**record, "progress": progress, "updatedAt": stamp(time)},
                        claim["token"])
            connection.commit()
            return True

    def fail(self, claim: dict[str, Any], *, transient: bool = False,
             now: datetime | None = None) -> bool:
        with self.repository.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            time = instant(now)
            record = self._fenced(connection, claim, time)
            if record is None:
                connection.commit()
                return False
            retryable = transient and record["attempt"] < record["maxAttempts"]
            self._write(connection, {**record, "status": "failed", "updatedAt": stamp(time),
                "leaseExpiresAt": None, "actualCost": ZERO_COST,
                "nextAttemptAt": stamp(time + timedelta(seconds=2 ** record["attempt"]))
                    if retryable else None,
                "error": {"code": "PROVIDER_TRANSIENT" if transient else "INVALID_PROVIDER_OUTPUT",
                          "message": "Local provider work failed; no result was staged",
                          "retryable": retryable}})
            connection.commit()
            return True

    def finish(self, claim: dict[str, Any], draft: dict[str, Any], *,
               now: datetime | None = None) -> bool:
        with self.repository.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            time = instant(now)
            record = self._fenced(connection, claim, time)
            if record is None:
                connection.commit()
                return False
            project, branch, request = record["projectId"], record["branchId"], record["request"]
            head = self.repository._branch(connection, project, branch)
            document = self.repository._snapshot(connection, head)["document"]
            if digest(build_context(document, request)) != record["inputHash"]:
                raise invalid("Captured job context hash does not match its immutable input")
            proposal = validate_proposal_record({**draft,
                "proposalId": "proposal_" + uuid4().hex, "projectId": project, "branchId": branch,
                "baseRevision": record["baseRevision"], "scopeIds": request["scopeIds"],
                "allowedOps": request["allowedOps"], "intent": request["intent"],
                "message": request["message"], "status": "pending_review",
                "createdAt": stamp(time), "reviewedAt": None, "reviewedBy": None,
                "approvalCommandId": None})
            portable(proposal, 131072)
            if (proposal["contextDigest"] != record["inputHash"]
                    or proposal["provider"] != record["provider"]
                    or proposal["modelVersion"] != record["modelVersion"]
                    or proposal["estimatedCost"] != ZERO_COST):
                raise invalid("Proposal provenance does not match the queued job")
            apply_proposal(document, proposal)
            connection.execute(agent_proposals.insert().values(
                proposal_id=proposal["proposalId"], project_id=project, branch_id=branch,
                # This private staging identity is independent of the exposed job
                # ID; synchronous clients cannot reserve it before completion.
                request_id="job_result_" + uuid4().hex, request=request, record=proposal,
            ))
            self._write(connection, {**record, "status": "succeeded", "updatedAt": stamp(time),
                "leaseExpiresAt": None, "actualCost": ZERO_COST, "progress": 100,
                "result": {"kind": "proposal", "proposalId": proposal["proposalId"],
                           "sha256": digest(proposal)}}, artifact=proposal)
            connection.commit()
            return True

    def result(self, project: str, branch: str, job_id: str) -> dict[str, Any]:
        with self.repository.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN")
            row = self._row(connection, project, branch, job_id, artifact=True)
            record = validate_job(row["record"])
            if record["status"] != "succeeded":
                raise CommandError(409, "JOB_RESULT_UNAVAILABLE", "The job has no completed result")
            artifact = validate_proposal_record(row["artifact"])
            portable(artifact, 131072)
            if (artifact["projectId"] != project or artifact["branchId"] != branch
                    or artifact["proposalId"] != record["result"]["proposalId"]
                    or artifact["baseRevision"] != record["baseRevision"]
                    or digest(artifact) != record["result"]["sha256"]):
                raise invalid("Stored result identity or digest is invalid")
            current = validate_proposal_record(self.repository._proposal(
                connection, project, branch, artifact["proposalId"],
            ))
            portable(current, 131072)
            decision_keys = {"status", "reviewedAt", "reviewedBy", "approvalCommandId"}
            if ({key: value for key, value in current.items() if key not in decision_keys}
                    != {key: value for key, value in artifact.items() if key not in decision_keys}):
                raise invalid("Stored proposal content differs from its frozen job artifact")
            return current
