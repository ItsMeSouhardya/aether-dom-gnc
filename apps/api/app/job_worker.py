"""Local worker; no provider work runs under a SQLite transaction."""

import argparse
import signal
import threading
from datetime import datetime
from types import FrameType
from typing import Any

from app.job_domain import digest
from app.job_repository import JobRepository
from app.proposal_domain import build_context, prepare_proposal
from app.proposal_provider import ProposalProvider
from app.repository import Repository


class _ObservedProvider:
    def __init__(self, provider: ProposalProvider) -> None:
        self.provider = provider
        self.name, self.model_version = provider.name, provider.model_version
        self.transient = False

    def generate(self, context: dict[str, Any]) -> str:
        try:
            return self.provider.generate(context)
        except (TimeoutError, ConnectionError):
            self.transient = True
            raise


def run_once(repository: Repository, *, now: datetime | None = None,
             lease_seconds: int = 30) -> bool:
    queue = JobRepository(repository)
    claim = queue.claim(now=now, lease_seconds=lease_seconds)
    if claim is None:
        return False
    provider = _ObservedProvider(repository.proposal_provider)
    job = claim["job"]
    try:
        document = repository.revision_document(job["projectId"], job["branchId"],
                                                job["baseRevision"])
        if (digest(build_context(document, job["request"])) != job["inputHash"]
                or provider.name != job["provider"]
                or provider.model_version != job["modelVersion"]):
            raise ValueError("Job input or provider identity changed")
        if not queue.progress(claim, max(25, job["progress"]), now=now):
            return True
        draft = prepare_proposal(document, job["request"], provider)
        if not queue.progress(claim, max(75, job["progress"]), now=now):
            return True
        queue.finish(claim, draft, now=now)
    except Exception:
        queue.fail(claim, transient=provider.transient, now=now)
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="AETHER-DOM bounded local proposal worker")
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--poll-seconds", type=float, default=1)
    parser.add_argument("--lease-seconds", type=int, default=30)
    args = parser.parse_args()
    if not 0.1 <= args.poll_seconds <= 60 or not 1 <= args.lease_seconds <= 300:
        parser.error("Polling must be 0.1–60 seconds; lease must be 1–300 seconds")
    stop = threading.Event()
    def shutdown(signum: int, frame: FrameType | None) -> None:
        stop.set()
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    repository = Repository()
    try:
        repository.initialize()
        while not stop.is_set():
            worked = run_once(repository, lease_seconds=args.lease_seconds)
            if args.once:
                break
            if not worked:
                stop.wait(args.poll_seconds)
    finally:
        repository.close()


if __name__ == "__main__":
    main()
