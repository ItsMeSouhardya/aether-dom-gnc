"""Migrations share the repository's explicit SQLite write transaction."""

from alembic import context

from app.persistence.tables import metadata

connection = context.config.attributes.get("connection")
if connection is None:
    raise RuntimeError("Use python -m app.migrate so database paths and locking stay consistent")
context.configure(connection=connection, target_metadata=metadata)
with context.begin_transaction():
    context.run_migrations()
