"""Only branch heads/stacks change; snapshots and command records are append-only."""

from sqlalchemy import JSON, Column, Integer, MetaData, String, Table

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
