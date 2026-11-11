"""Initial canonical snapshots, branch histories and immutable commands."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "branches",
        sa.Column("project_id", sa.String(), primary_key=True),
        sa.Column("branch_id", sa.String(), primary_key=True),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("undo_stack", sa.JSON(), nullable=False),
        sa.Column("redo_stack", sa.JSON(), nullable=False),
    )
    op.create_table(
        "snapshots",
        sa.Column("project_id", sa.String(), primary_key=True),
        sa.Column("branch_id", sa.String(), primary_key=True),
        sa.Column("revision", sa.Integer(), primary_key=True),
        sa.Column("document", sa.JSON(), nullable=False),
    )
    op.create_table(
        "commands",
        sa.Column("command_id", sa.String(), primary_key=True),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("branch_id", sa.String(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("forward", sa.JSON(), nullable=False),
        sa.Column("inverse", sa.JSON(), nullable=False),
        sa.Column("receipt", sa.JSON(), nullable=False),
        sa.Column("result", sa.JSON(), nullable=False),
    )
    op.create_index("ix_commands_branch_revision", "commands", [
        "project_id", "branch_id", "revision",
    ], unique=True)


def downgrade() -> None:
    op.drop_table("commands")
    op.drop_table("snapshots")
    op.drop_table("branches")
