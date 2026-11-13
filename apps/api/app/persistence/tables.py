"""Only branch heads/stacks change; snapshots and command records are append-only."""

from sqlalchemy import JSON, Column, Integer, MetaData, String, Table, UniqueConstraint

metadata = MetaData()
branches = Table(
    "branches", metadata,
    Column("project_id", String, primary_key=True),
    Column("branch_id", String, primary_key=True),
    Column("revision", Integer, nullable=False),
    Column("undo_stack", JSON, nullable=False),
    Column("redo_stack", JSON, nullable=False),
)
snapshots = Table(
    "snapshots", metadata,
    Column("project_id", String, primary_key=True),
    Column("branch_id", String, primary_key=True),
    Column("revision", Integer, primary_key=True),
    Column("document", JSON, nullable=False),
)
commands = Table(
    "commands", metadata,
    Column("command_id", String, primary_key=True),
    Column("project_id", String, nullable=False),
    Column("branch_id", String, nullable=False),
    Column("revision", Integer, nullable=False),
    Column("payload", JSON, nullable=False),
    Column("forward", JSON, nullable=False),
    Column("inverse", JSON, nullable=False),
    Column("receipt", JSON, nullable=False),
    Column("result", JSON, nullable=False),
)

# Review records are separate from canonical documents and immutable command history.
agent_proposals = Table(
    "agent_proposals", metadata,
    Column("proposal_id", String, primary_key=True),
    Column("project_id", String, nullable=False),
    Column("branch_id", String, nullable=False),
    Column("request_id", String, nullable=False, unique=True),
    Column("request", JSON, nullable=False),
    Column("record", JSON, nullable=False),
)

# Immutable creation receipts/lineage, never source commands or child undo records.
branch_forks = Table(
    "branch_forks", metadata,
    Column("command_id", String, primary_key=True),
    Column("project_id", String, nullable=False),
    Column("branch_id", String, nullable=False),
    Column("source_branch_id", String, nullable=False),
    Column("source_revision", Integer, nullable=False),
    Column("payload", JSON, nullable=False),
    Column("result", JSON, nullable=False),
    UniqueConstraint("project_id", "branch_id"),
)
